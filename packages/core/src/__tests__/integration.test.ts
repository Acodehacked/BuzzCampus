// Transactional tests for transitionPost() and transferCredits() against a
// real Postgres. These are the ones that prove the row locks, the ledger
// rows and the escrow round-trip actually work — the pure logic is covered
// in lifecycle.test.ts / ledger.test.ts.
//
//   TEST_DATABASE_URL=postgres://... npm test
//
// Without TEST_DATABASE_URL the whole file skips, so `npm test` stays green
// on a fresh clone with no database.

import { afterAll, beforeAll, describe, expect, it } from "vitest";

const TEST_DB = process.env.TEST_DATABASE_URL;
const describeDb = TEST_DB ? describe : describe.skip;

if (TEST_DB) process.env.DATABASE_URL = TEST_DB;

// packages/db hands out ONE pooled connection per process. Closing it in a
// per-suite afterAll would pull it out from under the suites that follow,
// so teardown happens once, here, after everything in the file.
afterAll(async () => {
  if (!TEST_DB) return;
  const { sql } = await import("@buzz/db");
  await sql.end({ timeout: 5 }).catch(() => undefined);
});

describeDb("transferCredits (transactional)", () => {
  let db: typeof import("@buzz/db").db;
  let schema: typeof import("@buzz/db");
  let ledger: typeof import("../ledger");
  let alice: string;
  let bob: string;

  beforeAll(async () => {
    schema = await import("@buzz/db");
    db = schema.db;
    ledger = await import("../ledger");

    const stamp = Date.now();
    const [a] = await db
      .insert(schema.users)
      .values({ email: `alice-${stamp}@test.edu`, name: "Alice" })
      .returning();
    const [b] = await db
      .insert(schema.users)
      .values({ email: `bob-${stamp}@test.edu`, name: "Bob" })
      .returning();

    alice = a!.id;
    bob = b!.id;
    await db.insert(schema.wallets).values([
      { userId: alice, balance: "10.00" },
      { userId: bob, balance: "0.00" },
    ]);
  });

  it("moves credits and writes one ledger row per side", async () => {
    const result = await ledger.transferCredits({
      fromUserId: alice,
      toUserId: bob,
      amount: "2.50",
      reason: "test_transfer",
    });

    expect(result.fromBalance).toBe("7.50");
    expect(result.toBalance).toBe("2.50");
    expect(result.entryIds).toHaveLength(2);
  });

  it("refuses to overdraw and leaves the balance untouched", async () => {
    const before = await ledger.getBalance(alice);
    await expect(
      ledger.transferCredits({
        fromUserId: alice,
        toUserId: bob,
        amount: "9999.00",
        reason: "test_overdraw",
      }),
    ).rejects.toThrow(/Not enough credits/);
    expect(await ledger.getBalance(alice)).toBe(before);
  });

  it("keeps the wallet reconcilable against its own ledger", async () => {
    const { ok } = await ledger.reconcileWallet(bob);
    expect(ok).toBe(true);
  });

  it("serialises concurrent spends instead of double-spending", async () => {
    const start = await ledger.getBalance(alice);
    const spends = Array.from({ length: 5 }, () =>
      ledger.transferCredits({
        fromUserId: alice,
        toUserId: bob,
        amount: "1.00",
        reason: "test_concurrent",
      }),
    );
    await Promise.all(spends);

    const { subtractCredits } = await import("../money");
    expect(await ledger.getBalance(alice)).toBe(subtractCredits(start, "5.00"));
  });
});

describeDb("transitionPost (transactional)", () => {
  let db: typeof import("@buzz/db").db;
  let schema: typeof import("@buzz/db");
  let lifecycle: typeof import("../lifecycle");
  let ledger: typeof import("../ledger");
  let asker: string;
  let helper: string;
  let postId: string;

  beforeAll(async () => {
    schema = await import("@buzz/db");
    db = schema.db;
    lifecycle = await import("../lifecycle");
    ledger = await import("../ledger");

    const stamp = Date.now();
    const [a] = await db
      .insert(schema.users)
      .values({ email: `asker-${stamp}@test.edu`, name: "Asker" })
      .returning();
    const [h] = await db
      .insert(schema.users)
      .values({ email: `helper-${stamp}@test.edu`, name: "Helper" })
      .returning();
    asker = a!.id;
    helper = h!.id;

    await db.insert(schema.wallets).values([
      { userId: asker, balance: "5.00" },
      { userId: helper, balance: "0.00" },
    ]);

    const [p] = await db
      .insert(schema.posts)
      .values({
        authorId: asker,
        type: "ask",
        category: "skills",
        title: "Need help with calculus",
        creditAmount: "2.00",
        metadata: { skillTag: "calculus" },
      })
      .returning();
    postId = p!.id;
  });

  it("locks escrow when the post is accepted", async () => {
    const result = await lifecycle.transitionPost({
      postId,
      actor: { id: helper, role: "student" },
      toStatus: "accepted",
      counterpartyId: helper,
    });

    expect(result.post.status).toBe("accepted");
    expect(result.credits?.movement).toBe("locked");
    expect(await ledger.getBalance(asker)).toBe("3.00");
    expect(await ledger.getEscrowHeld(postId)).toBe("2.00");
  });

  it("writes an immutable audit row for every move", async () => {
    await lifecycle.transitionPost({
      postId,
      actor: { id: helper, role: "student" },
      toStatus: "in_progress",
    });
    await lifecycle.transitionPost({
      postId,
      actor: { id: helper, role: "student" },
      toStatus: "fulfilled",
    });

    const history = await lifecycle.getPostHistory(postId);
    expect(history.map((h) => h.toStatus)).toEqual([
      "accepted",
      "in_progress",
      "fulfilled",
    ]);
  });

  it("rejects an illegal jump without leaving a trace", async () => {
    const before = (await lifecycle.getPostHistory(postId)).length;
    await expect(
      lifecycle.transitionPost({
        postId,
        actor: { id: asker, role: "student" },
        toStatus: "accepted",
      }),
    ).rejects.toThrow(/Cannot move a post/);
    expect((await lifecycle.getPostHistory(postId)).length).toBe(before);
  });

  it("releases escrow and writes contribution points on verify", async () => {
    const result = await lifecycle.transitionPost({
      postId,
      actor: { id: asker, role: "student" },
      toStatus: "verified",
      counterpartyId: helper,
    });

    expect(result.credits?.movement).toBe("released");
    expect(await ledger.getBalance(helper)).toBe("2.00");
    expect(await ledger.getEscrowHeld(postId)).toBe("0.00");

    const { getBuzzScore } = await import("../score");
    const score = await getBuzzScore(helper);
    expect(score.total).toBeGreaterThan(0);
    expect(score.byCategory.skills).toBeGreaterThan(0);
  });

  it("refunds escrow when accepted work is cancelled", async () => {
    const [p] = await db
      .insert(schema.posts)
      .values({
        authorId: asker,
        type: "ask",
        category: "skills",
        title: "Need help with statistics",
        creditAmount: "1.00",
        metadata: { skillTag: "statistics" },
      })
      .returning();

    const id = p!.id;
    const before = await ledger.getBalance(asker);

    await lifecycle.transitionPost({
      postId: id,
      actor: { id: helper, role: "student" },
      toStatus: "accepted",
      counterpartyId: helper,
    });

    const result = await lifecycle.transitionPost({
      postId: id,
      actor: { id: asker, role: "student" },
      toStatus: "cancelled",
      counterpartyId: helper,
    });

    expect(result.credits?.movement).toBe("refunded");
    expect(await ledger.getBalance(asker)).toBe(before);
    expect(await ledger.getEscrowHeld(id)).toBe("0.00");
  });
});
