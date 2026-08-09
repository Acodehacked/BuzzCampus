import { z } from "zod";

export const categorySchema = z.enum(["campus", "skills", "builds"]);
export const postTypeSchema = z.enum(["ask", "give"]);
export const postStatusSchema = z.enum([
  "open",
  "accepted",
  "in_progress",
  "fulfilled",
  "verified",
  "reopened",
  "cancelled",
]);
export const urgencySchema = z.enum(["low", "medium", "high"]);

const creditAmount = z
  .number()
  .min(0)
  .max(50)
  .refine((n) => Number.isFinite(n) && Math.round(n * 100) === n * 100, {
    message: "Credits go to two decimal places",
  });

// Normalise before validating — the scarcity index groups by exact tag, so
// "  React " and "react" have to collapse to the same row.
const skillTag = z
  .string()
  .trim()
  .toLowerCase()
  .min(2)
  .max(32)
  .regex(/^[a-z0-9][a-z0-9+#. -]*$/, "Letters, numbers and - . + # only");

/**
 * One compose schema for the whole platform. `category` discriminates which
 * extra fields are required — that variation lives in `metadata`, never in
 * a second table (CLAUDE.md Rule 3).
 */
export const createPostSchema = z
  .object({
    type: postTypeSchema,
    category: categorySchema,
    title: z.string().trim().min(6, "Give it a real title").max(140),
    description: z.string().trim().max(4000).optional(),
    creditAmount: creditAmount.optional(),

    // campus
    locationName: z.string().trim().max(120).optional(),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
    urgency: urgencySchema.optional(),
    photoUrl: z.string().url().max(2048).optional().or(z.literal("")),
    issueType: z.string().trim().max(48).optional(),
    isAnonymous: z.boolean().optional(),

    // skills
    skillTag: skillTag.optional(),
    durationMinutes: z.number().int().min(10).max(480).optional(),

    // builds
    buildId: z.string().uuid().optional(),
    roleNeeded: z.string().trim().max(64).optional(),
    requiredTags: z.array(skillTag).max(6).optional(),
    isMentorship: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.category === "campus" && !value.locationName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["locationName"],
        message: "Where is it? Campus reports need a location",
      });
    }
    if (value.category === "skills" && !value.skillTag) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["skillTag"],
        message: "Tag the skill so the right people see this",
      });
    }
    if (value.category === "builds" && !value.buildId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["buildId"],
        message: "Builds posts attach to a project",
      });
    }
    if (value.isAnonymous && value.category !== "campus") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["isAnonymous"],
        message: "Anonymous mode is only for sensitive Campus reports",
      });
    }
  });

export type CreatePostInput = z.infer<typeof createPostSchema>;

export const transitionPostSchema = z.object({
  postId: z.string().uuid(),
  toStatus: postStatusSchema,
  note: z.string().trim().max(600).optional(),
  attachmentUrl: z.string().url().max(2048).optional(),
  counterpartyId: z.string().uuid().optional(),
});

export const respondSchema = z.object({
  postId: z.string().uuid(),
  message: z.string().trim().max(600).optional(),
  scheduledAt: z.coerce.date().optional(),
});

export const acceptResponseSchema = z.object({
  responseId: z.string().uuid(),
});

export const feedSchema = z.object({
  category: categorySchema.optional(),
  type: postTypeSchema.optional(),
  status: postStatusSchema.optional(),
  search: z.string().trim().max(80).optional(),
  skillTag: skillTag.optional(),
  /** staff queue: scope to the viewer's department */
  mine: z.boolean().optional(),
  assignedToMe: z.boolean().optional(),
  cursor: z.number().int().min(0).optional(),
  limit: z.number().int().min(1).max(50).optional(),
  sort: z.enum(["relevance", "recent", "urgent"]).optional(),
});

export const reviewSchema = z.object({
  postId: z.string().uuid(),
  revieweeId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(600).optional(),
});
