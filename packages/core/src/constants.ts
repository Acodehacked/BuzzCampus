import type { Category, PipelineStage, PostStatus } from "@buzz/db";

/**
 * One status machine for the entire platform. Campus issues, Skills
 * sessions and Builds roles all walk this graph — see docs/PRD.md §9.1.
 */
export const ALLOWED_TRANSITIONS: Record<PostStatus, PostStatus[]> = {
  open: ["accepted", "cancelled"],
  // the accepted helper backed out → straight back to open
  accepted: ["in_progress", "open", "cancelled"],
  in_progress: ["fulfilled", "cancelled"],
  // the asker either signs off or says it wasn't good enough
  fulfilled: ["verified", "reopened"],
  verified: [],
  reopened: ["accepted", "in_progress", "cancelled"],
  cancelled: [],
};

export const TERMINAL_STATUSES: PostStatus[] = ["verified", "cancelled"];

export const STATUS_ORDER: PostStatus[] = [
  "open",
  "accepted",
  "in_progress",
  "fulfilled",
  "verified",
];

export const STATUS_LABEL: Record<PostStatus, string> = {
  open: "Open",
  accepted: "Accepted",
  in_progress: "In progress",
  fulfilled: "Fulfilled",
  verified: "Verified",
  reopened: "Reopened",
  cancelled: "Cancelled",
};

export const PIPELINE_ORDER: PipelineStage[] = [
  "idea",
  "prototype",
  "validated",
  "incubated",
  "launched",
];

export const PIPELINE_LABEL: Record<PipelineStage, string> = {
  idea: "Idea",
  prototype: "Prototype",
  validated: "Validated",
  incubated: "Incubated",
  launched: "Launched",
};

export const CATEGORY_LABEL: Record<Category, string> = {
  campus: "Campus",
  skills: "Skills",
  builds: "Builds",
};

/**
 * Contribution points feed the ONE Buzz Score (docs/PRD.md §6.4 #4).
 * Deliberately close in magnitude across categories — a Campus fix and a
 * Skills session are both "you helped someone", and the score must not
 * quietly privilege one category over another.
 */
export const CONTRIBUTION_POINTS = {
  /** awarded to whoever did the work, when a post reaches `verified` */
  helper: { campus: 15, skills: 12, builds: 14 } satisfies Record<Category, number>,
  /** awarded to the asker for closing the loop honestly */
  requester: 3,
  /** awarded when a Build advances a pipeline stage */
  buildStageAdvance: 8,
  /** awarded for leaving a review */
  review: 2,
} as const;

/** Default SLA windows for Campus, in hours, by urgency. */
export const CAMPUS_SLA_HOURS = { high: 12, medium: 48, low: 120 } as const;

/** Starter credit grant on signup — solves the Skills cold start. */
export const STARTER_CREDITS = "2.00";

/** Recurring-issue detection window, in days (docs/PRD.md §6.1 #6). */
export const RECURRING_WINDOW_DAYS = 30;
export const RECURRING_THRESHOLD = 3;

export const LEDGER_REASONS = {
  starterGrant: "starter_grant",
  escrowLock: "escrow_lock",
  escrowRelease: "escrow_release",
  escrowRefund: "escrow_refund",
  adminAdjustment: "admin_adjustment",
} as const;

export type LedgerReason =
  (typeof LEDGER_REASONS)[keyof typeof LEDGER_REASONS];
