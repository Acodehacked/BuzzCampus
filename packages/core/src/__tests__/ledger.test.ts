// Unit tests for transferCredits() — docs/BUILD_PLAN.md Phase 1.
//
// transferCredits is validated here at two levels:
//   1. the credit arithmetic it is built on, exhaustively and without a DB
//   2. its input guards, by calling the real function and asserting it
//      rejects before it ever touches the database
// The transactional path (row locks, ledger rows, escrow round-trips) is in
// integration.test.ts against a real Postgres.

import { describe, expect, it } from "vitest";
import {
  addCredits,
  compareCredits,
  formatCredits,
  fromMinor,
  isPositive,
  multiplyCredits,
  normalizeCredits,
  subtractCredits,
  toMinor,
} from "../money";
import { transferCredits } from "../ledger";
import { BuzzError } from "../errors";

describe("credit arithmetic", () => {
  it("never drifts on the classic floating-point cases", () => {
    expect(addCredits("0.10", "0.20")).toBe("0.30");
    expect(subtractCredits("1.00", "0.70")).toBe("0.30");
    expect(addCredits("0.07", "0.01")).toBe("0.08");
  });

  it("survives a long chain of small transfers exactly", () => {
    let balance = "0.00";
    for (let i = 0; i < 1000; i++) balance = addCredits(balance, "0.01");
    expect(balance).toBe("10.00");

    for (let i = 0; i < 1000; i++) balance = subtractCredits(balance, "0.01");
    expect(balance).toBe("0.00");
  });

  it("rounds a scarcity multiplier to the nearest cent", () => {
    expect(multiplyCredits("2.00", 1.3)).toBe("2.60");
    expect(multiplyCredits("1.50", 1.33)).toBe("2.00");
    expect(multiplyCredits("0.01", 1.5)).toBe("0.02");
  });

  it("compares without coercing through floats", () => {
    expect(compareCredits("2.00", "2.00")).toBe(0);
    expect(compareCredits("2.01", "2.00")).toBeGreaterThan(0);
    expect(compareCredits("1.99", "2.00")).toBeLessThan(0);
  });

  it("normalises whatever postgres hands back", () => {
    expect(normalizeCredits("2")).toBe("2.00");
    expect(normalizeCredits(2)).toBe("2.00");
    expect(normalizeCredits("2.5")).toBe("2.50");
  });

  it("round-trips through minor units", () => {
    for (const v of ["0.00", "0.01", "2.00", "10.55", "9999.99"]) {
      expect(fromMinor(toMinor(v))).toBe(v);
    }
  });

  it("rejects nonsense amounts rather than silently producing NaN", () => {
    expect(() => toMinor("abc")).toThrow();
    expect(() => toMinor("")).toThrow();
  });

  it("knows what counts as a real amount", () => {
    expect(isPositive("0.01")).toBe(true);
    expect(isPositive("0.00")).toBe(false);
    expect(isPositive(null)).toBe(false);
    expect(isPositive(undefined)).toBe(false);
  });

  it("formats for display without trailing noise", () => {
    expect(formatCredits("2.00")).toBe("2");
    expect(formatCredits("1.50")).toBe("1.5");
    expect(formatCredits("1.25")).toBe("1.25");
    expect(formatCredits(null)).toBe("0");
  });
});

describe("transferCredits guards", () => {
  // These all reject during validation, before any executor is touched —
  // so they need no database.
  it("refuses a zero-value transfer", async () => {
    await expect(
      transferCredits({
        fromUserId: "a",
        toUserId: "b",
        amount: "0.00",
        reason: "test",
      }),
    ).rejects.toThrow(BuzzError);
  });

  it("refuses a negative transfer", async () => {
    await expect(
      transferCredits({
        fromUserId: "a",
        toUserId: "b",
        amount: "-5.00",
        reason: "test",
      }),
    ).rejects.toThrow(/greater than zero/);
  });

  it("refuses a transfer with no real wallet on either side", async () => {
    await expect(
      transferCredits({
        fromUserId: null,
        toUserId: null,
        amount: "1.00",
        reason: "test",
      }),
    ).rejects.toThrow(/at least one real wallet/);
  });

  it("refuses a wallet paying itself", async () => {
    await expect(
      transferCredits({
        fromUserId: "same",
        toUserId: "same",
        amount: "1.00",
        reason: "test",
      }),
    ).rejects.toThrow(/same wallet/);
  });
});
