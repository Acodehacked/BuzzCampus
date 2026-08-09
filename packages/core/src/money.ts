/**
 * Credits are stored as `numeric(10,2)` and come back from postgres-js as
 * strings. Every arithmetic step here goes through integer minor units so
 * a balance can never drift by a floating-point epsilon — the ledger has to
 * be exactly right (docs/PRD.md §11).
 */

const SCALE = 100;

export function toMinor(value: string | number): number {
  const n = typeof value === "number" ? value : Number.parseFloat(value);
  if (!Number.isFinite(n)) {
    throw new Error(`Not a valid credit amount: ${String(value)}`);
  }
  return Math.round(n * SCALE);
}

export function fromMinor(minor: number): string {
  return (minor / SCALE).toFixed(2);
}

export function addCredits(a: string, b: string): string {
  return fromMinor(toMinor(a) + toMinor(b));
}

export function subtractCredits(a: string, b: string): string {
  return fromMinor(toMinor(a) - toMinor(b));
}

export function multiplyCredits(a: string, factor: number): string {
  return fromMinor(Math.round(toMinor(a) * factor));
}

export function compareCredits(a: string, b: string): number {
  return toMinor(a) - toMinor(b);
}

export function isPositive(a: string | null | undefined): boolean {
  if (a == null) return false;
  return toMinor(a) > 0;
}

export function normalizeCredits(value: string | number): string {
  return fromMinor(toMinor(value));
}

/** Display helper: "2.00" → "2", "1.50" → "1.5" — mono-font friendly. */
export function formatCredits(value: string | number | null | undefined): string {
  if (value == null) return "0";
  const normalized = normalizeCredits(value);
  return normalized.replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
}
