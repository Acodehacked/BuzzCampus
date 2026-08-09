// Unit tests for transitionPost() — docs/BUILD_PLAN.md Phase 1.
//
// The decision logic inside transitionPost (which transitions are legal,
// who is allowed to make them, what happens to escrowed credits) is pure
// and tested exhaustively here without a database. The transactional
// wiring is covered by integration.test.ts, which runs against a real
// Postgres when TEST_DATABASE_URL is set.

import { describe, expect, it } from "vitest";
import {
  assertActorMayTransition,
  canTransition,
  escrowPlanFor,
  nextStatuses,
  resolveParties,
  type Actor,
} from "../lifecycle";
import { ALLOWED_TRANSITIONS, STATUS_ORDER } from "../constants";
import { BuzzError } from "../errors";
import type { PostStatus } from "@buzz/db";

const ALL_STATUSES: PostStatus[] = [
  "open",
  "accepted",
  "in_progress",
  "fulfilled",
  "verified",
  "reopened",
  "cancelled",
];

const student = (id = "student-1"): Actor => ({ id, role: "student" });
const staff = (id = "staff-1"): Actor => ({ id, role: "staff" });
const admin = (id = "admin-1"): Actor => ({ id, role: "admin" });
const safety = (id = "safety-1"): Actor => ({ id, role: "safety" });

const post = (over: Partial<Parameters<typeof assertActorMayTransition>[0]> = {}) => ({
  authorId: "student-1",
  isAnonymous: false,
  category: "skills" as const,
  type: "ask" as const,
  ...over,
});

describe("the status graph", () => {
  it("walks the happy path all the way to verified", () => {
    for (let i = 0; i < STATUS_ORDER.length - 1; i++) {
      expect(canTransition(STATUS_ORDER[i]!, STATUS_ORDER[i + 1]!)).toBe(true);
    }
  });

  it("treats verified and cancelled as terminal", () => {
    expect(nextStatuses("verified")).toHaveLength(0);
    expect(nextStatuses("cancelled")).toHaveLength(0);
  });

  it("never allows a post to skip a stage", () => {
    expect(canTransition("open", "fulfilled")).toBe(false);
    expect(canTransition("open", "verified")).toBe(false);
    expect(canTransition("accepted", "verified")).toBe(false);
    expect(canTransition("in_progress", "verified")).toBe(false);
  });

  it("never allows a verified post to move again", () => {
    for (const to of ALL_STATUSES) {
      expect(canTransition("verified", to)).toBe(false);
    }
  });

  it("allows a rejected fulfilment to reopen", () => {
    expect(canTransition("fulfilled", "reopened")).toBe(true);
    expect(canTransition("reopened", "accepted")).toBe(true);
  });

  it("lets a helper who backed out release the post", () => {
    expect(canTransition("accepted", "open")).toBe(true);
  });

  it("has an entry for every status, so the graph is total", () => {
    for (const status of ALL_STATUSES) {
      expect(ALLOWED_TRANSITIONS[status]).toBeDefined();
    }
  });

  it("never lists a transition to itself", () => {
    for (const status of ALL_STATUSES) {
      expect(ALLOWED_TRANSITIONS[status]).not.toContain(status);
    }
  });
});

describe("authorisation", () => {
  // The author accepting an offer is the main flow of the whole platform,
  // so what's barred is self-dealing — being the counterparty on your own
  // post — not being the person who clicks accept.
  it("lets the author accept someone else's offer", () => {
    expect(() =>
      assertActorMayTransition(
        post(),
        student("student-1"),
        "accepted",
        undefined,
        "student-2",
      ),
    ).not.toThrow();
  });

  it("stops you being the counterparty on your own post", () => {
    expect(() =>
      assertActorMayTransition(
        post(),
        student("student-1"),
        "accepted",
        undefined,
        "student-1",
      ),
    ).toThrow(/fulfils your own post/);
  });

  it("stops self-dealing on a Give as well as an Ask", () => {
    expect(() =>
      assertActorMayTransition(
        post({ type: "give" }),
        student("student-1"),
        "accepted",
        undefined,
        "student-1",
      ),
    ).toThrow(BuzzError);
  });

  it("lets someone else accept an Ask", () => {
    expect(() =>
      assertActorMayTransition(
        post(),
        student("student-2"),
        "accepted",
        undefined,
        "student-2",
      ),
    ).not.toThrow();
  });

  it("lets a Give be taken up by a learner", () => {
    expect(() =>
      assertActorMayTransition(
        post({ type: "give" }),
        student("student-1"),
        "accepted",
        undefined,
        "student-9",
      ),
    ).not.toThrow();
  });

  it("only lets the asker verify", () => {
    expect(() =>
      assertActorMayTransition(post(), student("student-2"), "verified"),
    ).toThrow(/Only the person who posted/);

    expect(() =>
      assertActorMayTransition(post(), student("student-1"), "verified"),
    ).not.toThrow();
  });

  it("lets an admin verify anything", () => {
    expect(() =>
      assertActorMayTransition(post(), admin(), "verified"),
    ).not.toThrow();
  });

  it("lets Campus staff verify a Campus report, with an after-photo", () => {
    const campusPost = post({ category: "campus" });
    expect(() =>
      assertActorMayTransition(campusPost, staff(), "verified", "https://x/y.jpg"),
    ).not.toThrow();
  });

  it("refuses to close a Campus report without an after-photo", () => {
    const campusPost = post({ category: "campus" });
    expect(() =>
      assertActorMayTransition(campusPost, staff(), "verified"),
    ).toThrow(/after-photo/);
  });

  it("does not demand an after-photo for Skills or Builds", () => {
    expect(() =>
      assertActorMayTransition(post({ category: "skills" }), admin(), "verified"),
    ).not.toThrow();
    expect(() =>
      assertActorMayTransition(post({ category: "builds" }), admin(), "verified"),
    ).not.toThrow();
  });

  it("only lets the author cancel or reopen", () => {
    expect(() =>
      assertActorMayTransition(post(), student("student-9"), "cancelled"),
    ).toThrow(BuzzError);
    expect(() =>
      assertActorMayTransition(post(), student("student-9"), "reopened"),
    ).toThrow(BuzzError);
  });
});

describe("sensitive Campus reports", () => {
  const sensitive = post({ category: "campus", isAnonymous: true });

  it("locks out ordinary students", () => {
    expect(() =>
      assertActorMayTransition(sensitive, student("student-2"), "accepted"),
    ).toThrow(/Safety Officer/);
  });

  it("locks out facility staff", () => {
    expect(() =>
      assertActorMayTransition(sensitive, staff(), "accepted"),
    ).toThrow(/Safety Officer/);
  });

  // docs/PRD.md §11 — explicitly including platform admins.
  it("locks out platform admins too", () => {
    expect(() =>
      assertActorMayTransition(sensitive, admin(), "accepted"),
    ).toThrow(/Safety Officer/);
  });

  it("lets the Safety Officer through", () => {
    expect(() =>
      assertActorMayTransition(sensitive, safety(), "accepted"),
    ).not.toThrow();
  });

  it("lets the reporter act on their own report", () => {
    expect(() =>
      assertActorMayTransition(sensitive, student("student-1"), "cancelled"),
    ).not.toThrow();
  });
});

describe("who pays whom", () => {
  it("has the author pay on an Ask", () => {
    const { payerId, payeeId } = resolveParties(
      { type: "ask", authorId: "asker" },
      "helper",
    );
    expect(payerId).toBe("asker");
    expect(payeeId).toBe("helper");
  });

  it("has the accepter pay on a Give", () => {
    const { payerId, payeeId } = resolveParties(
      { type: "give", authorId: "teacher" },
      "learner",
    );
    expect(payerId).toBe("learner");
    expect(payeeId).toBe("teacher");
  });

  it("survives an unknown counterparty without crashing", () => {
    const { payerId, payeeId } = resolveParties(
      { type: "ask", authorId: "asker" },
      null,
    );
    expect(payerId).toBe("asker");
    expect(payeeId).toBeNull();
  });
});

describe("escrow rules", () => {
  it("locks credits when the post is accepted", () => {
    expect(escrowPlanFor("open", "accepted")).toBe("lock");
  });

  it("releases credits only on verification, never on fulfilment", () => {
    expect(escrowPlanFor("in_progress", "fulfilled")).toBeNull();
    expect(escrowPlanFor("fulfilled", "verified")).toBe("release");
  });

  it("refunds when work that had started falls through", () => {
    expect(escrowPlanFor("accepted", "cancelled")).toBe("refund");
    expect(escrowPlanFor("in_progress", "cancelled")).toBe("refund");
    expect(escrowPlanFor("accepted", "open")).toBe("refund");
    expect(escrowPlanFor("fulfilled", "reopened")).toBe("refund");
  });

  it("has nothing to refund on a post cancelled before anyone accepted", () => {
    expect(escrowPlanFor("open", "cancelled")).toBeNull();
  });

  it("never both releases and refunds the same transition", () => {
    for (const from of ALL_STATUSES) {
      for (const to of ALL_STATUSES) {
        const plan = escrowPlanFor(from, to);
        expect(["lock", "release", "refund", null]).toContain(plan);
      }
    }
  });
});
