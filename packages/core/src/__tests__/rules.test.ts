// Tests for the rest of the shared rules: scarcity, SLA, the one Buzz
// Score's tiering, the sensitive-report policy, and the compose validation.

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { computeMultiplier, scarcitySpread, SCARCITY_CEILING, SCARCITY_FLOOR } from "../scarcity";
import { computeSla, formatSlaRemaining, slaHoursFor } from "../sla";
import { pointsToNextTier, tierFor } from "../score";
import { canSeeAuthorIdentity, canSeePost, redactAuthor } from "../policy";
import {
  campusEmailMessage,
  createPostSchema,
  isCampusEmail,
} from "../validation";
import { explainRank, haversine } from "../ranking";

describe("scarcity index", () => {
  it("sits at neutral when supply matches demand", () => {
    expect(computeMultiplier(3, 3)).toBe(1);
    expect(computeMultiplier(0, 0)).toBe(1);
  });

  it("pays more when a skill is scarce", () => {
    expect(computeMultiplier(5, 0)).toBeGreaterThan(1);
    expect(computeMultiplier(10, 1)).toBeGreaterThan(computeMultiplier(5, 1));
  });

  // The damped curve exists so the index keeps discriminating between
  // "scarce" and "very scarce" instead of pinning everything to the ceiling.
  it("still separates scarce from very scarce near the top", () => {
    expect(computeMultiplier(4, 0)).toBeLessThan(computeMultiplier(20, 0));
    expect(computeMultiplier(4, 0)).toBeGreaterThan(computeMultiplier(2, 0));
  });

  it("pays less when a skill is abundant", () => {
    expect(computeMultiplier(0, 5)).toBeLessThan(1);
  });

  it("stays inside the floor and ceiling under any input", () => {
    for (const [asks, gives] of [
      [0, 0],
      [0, 1000],
      [1000, 0],
      [1, 1],
      [500, 3],
    ] as const) {
      const m = computeMultiplier(asks, gives);
      expect(m).toBeGreaterThanOrEqual(SCARCITY_FLOOR);
      expect(m).toBeLessThanOrEqual(SCARCITY_CEILING);
    }
  });

  it("reports the spread across the whole index", () => {
    expect(
      scarcitySpread([
        { skillTag: "a", multiplier: 2, openRequests: 0, activeGivers: 0 },
        { skillTag: "b", multiplier: 0.75, openRequests: 0, activeGivers: 0 },
      ]),
    ).toBe(1.25);
    expect(scarcitySpread([])).toBe(0);
  });
});

describe("campus SLA", () => {
  const campusPost = (over: Record<string, unknown> = {}) =>
    ({
      category: "campus" as const,
      status: "open" as const,
      createdAt: new Date("2026-01-01T00:00:00Z"),
      metadata: { urgency: "medium" as const },
      ...over,
    });

  it("derives the window from urgency", () => {
    expect(slaHoursFor({ urgency: "high" })).toBe(12);
    expect(slaHoursFor({ urgency: "medium" })).toBe(48);
    expect(slaHoursFor({ urgency: "low" })).toBe(120);
  });

  it("lets an explicit slaHours override urgency", () => {
    expect(slaHoursFor({ urgency: "low", slaHours: 4 })).toBe(4);
  });

  it("falls back to medium when nothing is set", () => {
    expect(slaHoursFor(null)).toBe(48);
    expect(slaHoursFor({})).toBe(48);
  });

  it("returns nothing for non-Campus posts", () => {
    expect(computeSla(campusPost({ category: "skills" }) as never)).toBeNull();
    expect(computeSla(campusPost({ category: "builds" }) as never)).toBeNull();
  });

  it("flags a breach once the window has passed", () => {
    const sla = computeSla(
      campusPost() as never,
      new Date("2026-01-04T00:00:00Z"),
    );
    expect(sla?.breached).toBe(true);
    expect(sla?.severity).toBe("breached");
  });

  it("warns before it breaches", () => {
    const sla = computeSla(
      campusPost() as never,
      new Date("2026-01-02T18:00:00Z"),
    );
    expect(sla?.breached).toBe(false);
    expect(sla?.severity).toBe("warning");
  });

  it("freezes the clock once the issue is verified", () => {
    const sla = computeSla(
      campusPost({ status: "verified" }) as never,
      new Date("2026-06-01T00:00:00Z"),
      new Date("2026-01-01T06:00:00Z"),
    );
    expect(sla?.breached).toBe(false);
  });

  it("formats the countdown both ways", () => {
    expect(formatSlaRemaining(3_600_000 * 5)).toContain("left");
    expect(formatSlaRemaining(-3_600_000 * 5)).toContain("over");
    expect(formatSlaRemaining(60_000 * 30)).toBe("30m left");
  });
});

describe("the one Buzz Score", () => {
  it("tiers on the total, not per category", () => {
    expect(tierFor(0)).toBe("newcomer");
    expect(tierFor(40)).toBe("contributor");
    expect(tierFor(150)).toBe("regular");
    expect(tierFor(400)).toBe("pillar");
  });

  it("tells you what is left to the next tier", () => {
    expect(pointsToNextTier(10)).toEqual({ next: "contributor", needed: 30 });
    expect(pointsToNextTier(500)).toBeNull();
  });
});

describe("sensitive report policy", () => {
  const sensitive = { isAnonymous: true, authorId: "reporter" };
  const ordinary = { isAnonymous: false, authorId: "reporter" };

  it("hides sensitive reports from everyone but safety and the reporter", () => {
    expect(canSeePost(sensitive, { id: "x", role: "student" })).toBe(false);
    expect(canSeePost(sensitive, { id: "x", role: "staff" })).toBe(false);
    expect(canSeePost(sensitive, { id: "x", role: "admin" })).toBe(false);
    expect(canSeePost(sensitive, { id: "x", role: "safety" })).toBe(true);
    expect(canSeePost(sensitive, { id: "reporter", role: "student" })).toBe(true);
    expect(canSeePost(sensitive, null)).toBe(false);
  });

  it("leaves ordinary posts fully public", () => {
    expect(canSeePost(ordinary, null)).toBe(true);
    expect(canSeeAuthorIdentity(ordinary, null)).toBe(true);
  });

  it("replaces the author with a placeholder rather than leaking null", () => {
    const redacted = redactAuthor(
      sensitive,
      { id: "reporter", name: "Real Name", department: "Civil" },
      { id: "someone", role: "admin" },
    );
    expect(redacted.name).toBe("Anonymous report");
    expect(redacted.id).toBeNull();
    expect(redacted.department).toBeNull();
    expect(JSON.stringify(redacted)).not.toContain("Real Name");
  });

  it("shows the real author to the Safety Officer", () => {
    const seen = redactAuthor(
      sensitive,
      { id: "reporter", name: "Real Name", department: "Civil" },
      { id: "officer", role: "safety" },
    );
    expect(seen.name).toBe("Real Name");
  });
});

describe("compose validation", () => {
  const base = { type: "ask" as const, title: "Something needs doing" };

  it("requires a location on a Campus report", () => {
    expect(
      createPostSchema.safeParse({ ...base, category: "campus" }).success,
    ).toBe(false);
    expect(
      createPostSchema.safeParse({
        ...base,
        category: "campus",
        locationName: "Block C",
      }).success,
    ).toBe(true);
  });

  it("requires a skill tag on a Skills post", () => {
    expect(
      createPostSchema.safeParse({ ...base, category: "skills" }).success,
    ).toBe(false);
  });

  it("lowercases skill tags so the index groups correctly", () => {
    const parsed = createPostSchema.parse({
      ...base,
      category: "skills",
      skillTag: "  React  ",
    });
    expect(parsed.skillTag).toBe("react");
  });

  it("requires a Build to attach to on a Builds post", () => {
    expect(
      createPostSchema.safeParse({ ...base, category: "builds" }).success,
    ).toBe(false);
  });

  it("only allows anonymous mode on Campus", () => {
    expect(
      createPostSchema.safeParse({
        ...base,
        category: "skills",
        skillTag: "react",
        isAnonymous: true,
      }).success,
    ).toBe(false);
  });
});

describe("campus email restriction", () => {
  // isCampusEmail reads its config at call time, and the developer's own
  // .env sets CAMPUS_EMAIL_DOMAINS — so each case has to state the config
  // it's actually testing rather than inheriting the ambient one.
  const originalDomains = process.env.CAMPUS_EMAIL_DOMAINS;
  const originalMode = process.env.CAMPUS_EMAIL_MODE;

  const restore = (key: string, value: string | undefined) => {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  };

  afterEach(() => {
    restore("CAMPUS_EMAIL_DOMAINS", originalDomains);
    restore("CAMPUS_EMAIL_MODE", originalMode);
  });

  const useDefault = () => {
    delete process.env.CAMPUS_EMAIL_DOMAINS;
    delete process.env.CAMPUS_EMAIL_MODE;
  };

  describe("allowlist mode", () => {
    it("accepts the configured domain and its subdomains", () => {
      process.env.CAMPUS_EMAIL_DOMAINS = "sjcetpalai.ac.in";
      expect(isCampusEmail("abinantony2028@sjcetpalai.ac.in")).toBe(true);
      // The real-world shape: department subdomains under the college.
      expect(isCampusEmail("abinantony2028@es.sjcetpalai.ac.in")).toBe(true);
      expect(isCampusEmail("a@cse.sjcetpalai.ac.in")).toBe(true);
    });

    it("rejects other institutions", () => {
      process.env.CAMPUS_EMAIL_DOMAINS = "sjcetpalai.ac.in";
      expect(isCampusEmail("a@university.edu")).toBe(false);
      expect(isCampusEmail("a@othercollege.ac.in")).toBe(false);
    });

    it("does not let a lookalike domain sneak past the suffix check", () => {
      process.env.CAMPUS_EMAIL_DOMAINS = "sjcetpalai.ac.in";
      expect(isCampusEmail("a@notsjcetpalai.ac.in")).toBe(false);
      expect(isCampusEmail("a@sjcetpalai.ac.in.evil.com")).toBe(false);
    });

    it("accepts several domains, and tolerates a leading @", () => {
      process.env.CAMPUS_EMAIL_DOMAINS = "@a.edu, b.ac.uk";
      expect(isCampusEmail("x@a.edu")).toBe(true);
      expect(isCampusEmail("x@b.ac.uk")).toBe(true);
      expect(isCampusEmail("x@c.edu")).toBe(false);
    });
  });

  describe("academic mode", () => {
    beforeEach(() => {
      delete process.env.CAMPUS_EMAIL_DOMAINS;
      process.env.CAMPUS_EMAIL_MODE = "academic";
    });

    it("accepts academic markers from around the world", () => {
      for (const domain of [
        "university.edu",
        "es.sjcetpalai.ac.in",
        "ox.ac.uk",
        "u-tokyo.ac.jp",
        "iiit.edu.in",
        "unsw.edu.au",
        "uni-heidelberg.de",
        "univ-lyon1.fr",
        "students.someplace.org",
      ]) {
        expect(isCampusEmail(`a@${domain}`), domain).toBe(true);
      }
    });

    it("rejects domains with no academic marker, even real universities", () => {
      // This is the documented cost of academic mode — ETH Zürich and TU
      // Delft carry no marker, which is exactly why it isn't the default.
      expect(isCampusEmail("a@ethz.ch")).toBe(false);
      expect(isCampusEmail("a@tudelft.nl")).toBe(false);
    });

    it("still rejects consumer mail", () => {
      expect(isCampusEmail("a@gmail.com")).toBe(false);
    });
  });

  describe("default (non-consumer) mode", () => {
    it("accepts any college on earth, marker or not", () => {
      useDefault();
      for (const domain of [
        "es.sjcetpalai.ac.in", // India
        "university.edu", // US
        "ox.ac.uk", // UK
        "ethz.ch", // Switzerland — no academic marker
        "tudelft.nl", // Netherlands
        "mcgill.ca", // Canada
        "unibo.it", // Italy
        "kth.se", // Sweden
        "u-tokyo.ac.jp", // Japan
        "usp.br", // Brazil
      ]) {
        expect(isCampusEmail(`a@${domain}`), domain).toBe(true);
      }
    });

    it("rejects the consumer providers students actually have", () => {
      useDefault();
      for (const domain of [
        "gmail.com",
        "googlemail.com",
        "yahoo.com",
        "yahoo.co.in",
        "hotmail.com",
        "hotmail.co.uk",
        "outlook.com",
        "outlook.com.br",
        "live.co.uk",
        "icloud.com",
        "proton.me",
        "protonmail.com",
        "rediffmail.com",
        "qq.com",
        "163.com",
        "mail.ru",
        "yandex.ru",
        "web.de",
      ]) {
        expect(isCampusEmail(`a@${domain}`), domain).toBe(false);
      }
    });

    it("rejects disposable inboxes", () => {
      useDefault();
      expect(isCampusEmail("a@mailinator.com")).toBe(false);
      expect(isCampusEmail("a@yopmail.com")).toBe(false);
      expect(isCampusEmail("a@10minutemail.net")).toBe(false);
    });

    // The bug a naive prefix match would introduce: plenty of universities
    // host mail on mail.<college>, and yahoo/live are ordinary words.
    it("does not mistake a university mail host for a consumer provider", () => {
      useDefault();
      expect(isCampusEmail("a@mail.sjcetpalai.ac.in")).toBe(true);
      expect(isCampusEmail("a@mail.university.edu")).toBe(true);
      expect(isCampusEmail("a@live.university.edu")).toBe(true);
      expect(isCampusEmail("a@webmail.unibo.it")).toBe(true);
    });
  });

  describe("malformed input", () => {
    it("rejects anything that isn't one address", () => {
      useDefault();
      expect(isCampusEmail("not-an-email")).toBe(false);
      expect(isCampusEmail("")).toBe(false);
      expect(isCampusEmail("@university.edu")).toBe(false);
      expect(isCampusEmail("a@")).toBe(false);
      expect(isCampusEmail("a@b@university.edu")).toBe(false);
      expect(isCampusEmail("a@localhost")).toBe(false);
      expect(isCampusEmail("a@.university.edu")).toBe(false);
      expect(isCampusEmail("a@university.edu.")).toBe(false);
    });
  });

  it("ignores an empty allowlist and falls back to the default", () => {
    process.env.CAMPUS_EMAIL_DOMAINS = "";
    delete process.env.CAMPUS_EMAIL_MODE;
    expect(isCampusEmail("a@ethz.ch")).toBe(true);
    expect(isCampusEmail("a@gmail.com")).toBe(false);
  });

  describe("the message shown on rejection", () => {
    it("names the domain when there's one to name", () => {
      process.env.CAMPUS_EMAIL_DOMAINS = "sjcetpalai.ac.in";
      expect(campusEmailMessage()).toContain("@sjcetpalai.ac.in");
    });

    it("reads as a sentence with two", () => {
      process.env.CAMPUS_EMAIL_DOMAINS = "sjcetpalai.ac.in,ajce.ac.in";
      expect(campusEmailMessage()).toContain("@sjcetpalai.ac.in or @ajce.ac.in");
    });

    it("stops listing once the list stops helping", () => {
      process.env.CAMPUS_EMAIL_DOMAINS = "a.edu,b.edu,c.edu,d.edu,e.edu";
      const message = campusEmailMessage();
      expect(message).not.toContain("@a.edu");
      expect(message).toContain("institutional email");
    });

    it("explains the default rule in the default mode", () => {
      useDefault();
      expect(campusEmailMessage()).toContain("personal email");
    });
  });
});

describe("feed ranking explanations", () => {
  it("names the skill match that pulled a post up", () => {
    expect(
      explainRank(
        { category: "skills", metadata: { skillTag: "react" } },
        { skillTags: ["react"] },
      ),
    ).toBe("Matches your react");
  });

  it("explains teammate discovery in the shared feed", () => {
    expect(
      explainRank(
        { category: "builds", metadata: { requiredTags: ["arduino"] } },
        { skillTags: ["arduino"] },
      ),
    ).toBe("Needs arduino — you offer that");
  });

  it("says nothing when nothing matched", () => {
    expect(explainRank({ category: "skills", metadata: {} }, {})).toBeNull();
  });

  it("measures campus distance sanely", () => {
    expect(Math.round(haversine(12.97, 77.59, 12.97, 77.59))).toBe(0);
    expect(haversine(12.97, 77.59, 12.98, 77.59)).toBeGreaterThan(1000);
  });
});
