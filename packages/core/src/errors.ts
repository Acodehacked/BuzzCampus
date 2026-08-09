/**
 * Domain errors thrown by packages/core. The tRPC layer maps these onto
 * TRPCError codes — core itself stays transport-agnostic.
 */
export class BuzzError extends Error {
  constructor(
    message: string,
    readonly code:
      | "NOT_FOUND"
      | "FORBIDDEN"
      | "INVALID_TRANSITION"
      | "INSUFFICIENT_CREDITS"
      | "CONFLICT"
      | "BAD_REQUEST",
  ) {
    super(message);
    this.name = "BuzzError";
  }
}

export const notFound = (what: string) =>
  new BuzzError(`${what} not found`, "NOT_FOUND");

export const forbidden = (why: string) => new BuzzError(why, "FORBIDDEN");

export const invalidTransition = (from: string, to: string) =>
  new BuzzError(`Cannot move a post from "${from}" to "${to}"`, "INVALID_TRANSITION");

export const insufficientCredits = (have: string, need: string) =>
  new BuzzError(
    `Not enough credits — balance is ${have}, this needs ${need}`,
    "INSUFFICIENT_CREDITS",
  );

export const conflict = (why: string) => new BuzzError(why, "CONFLICT");

export const badRequest = (why: string) => new BuzzError(why, "BAD_REQUEST");
