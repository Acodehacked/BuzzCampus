// Tests for the rest of the shared rules: scarcity, SLA, the one Buzz
// Score's tiering, the sensitive-report policy, and the compose validation.

import { describe, expect, it } from "vitest";
import { computeMultiplier, scarcitySpread, SCARCITY_CEILING, SCARCITY_FLOOR } from "../scarcity";
import { computeSla, formatSlaRemaining, slaHoursFor } from "../sla";
import { pointsToNextTier, tierFor } from "../score";
import { canSeeAuthorIdentity, canSeePost, redactAuthor } from "../policy";
import { createPostSchema, isCampusEmail } from "../validation";
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
  it("accepts academic domains by default", () => {
    expect(isCampusEmail("a@university.edu")).toBe(true);
    expect(isCampusEmail("a@dept.university.edu")).toBe(true);
    expect(isCampusEmail("a@college.ac.in")).toBe(true);
  });

  it("rejects everything else", () => {
    expect(isCampusEmail("a@gmail.com")).toBe(false);
    expect(isCampusEmail("not-an-email")).toBe(false);
    expect(isCampusEmail("")).toBe(false);
  });

  it("honours an explicit allowlist", () => {
    process.env.CAMPUS_EMAIL_DOMAINS = "buzzcampus.test";
    expect(isCampusEmail("a@buzzcampus.test")).toBe(true);
    expect(isCampusEmail("a@cse.buzzcampus.test")).toBe(true);
    expect(isCampusEmail("a@university.edu")).toBe(false);
    delete process.env.CAMPUS_EMAIL_DOMAINS;
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
