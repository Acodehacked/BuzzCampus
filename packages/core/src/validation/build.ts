import { z } from "zod";

export const buildTypeSchema = z.enum(["fyp", "startup", "hackathon", "research"]);
export const pipelineStageSchema = z.enum([
  "idea",
  "prototype",
  "validated",
  "incubated",
  "launched",
]);

const optionalUrl = z
  .string()
  .trim()
  .max(2048)
  .url("That doesn't look like a URL")
  .optional()
  .or(z.literal(""));

export const createBuildSchema = z.object({
  title: z.string().trim().min(4).max(140),
  description: z.string().trim().max(6000).optional(),
  type: buildTypeSchema,
  department: z.string().trim().max(80).optional(),
  year: z
    .number()
    .int()
    .min(2000)
    .max(new Date().getFullYear() + 2)
    .optional(),
  tags: z.array(z.string().trim().min(1).max(32)).max(10).optional(),
  reportUrl: optionalUrl,
  repoUrl: optionalUrl,
  demoUrl: optionalUrl,
  coverImageUrl: optionalUrl,
});

export const updateBuildSchema = createBuildSchema.partial().extend({
  id: z.string().uuid(),
});

export const advanceStageSchema = z.object({
  buildId: z.string().uuid(),
  stage: pipelineStageSchema,
  note: z.string().trim().max(600).optional(),
});

export const milestoneSchema = z.object({
  buildId: z.string().uuid(),
  title: z.string().trim().min(3).max(140),
  note: z.string().trim().max(2000).optional(),
});

export const teamMemberSchema = z.object({
  buildId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.string().trim().max(64).optional(),
});

export const openRoleSchema = z.object({
  buildId: z.string().uuid(),
  roleNeeded: z.string().trim().min(2).max(64),
  description: z.string().trim().max(2000).optional(),
  requiredTags: z.array(z.string().trim().min(1).max(32)).min(1).max(6),
  creditAmount: z.number().min(0).max(50).optional(),
  isMentorship: z.boolean().optional(),
});

export const archiveQuerySchema = z.object({
  search: z.string().trim().max(80).optional(),
  department: z.string().trim().max(80).optional(),
  year: z.number().int().min(2000).max(2100).optional(),
  type: buildTypeSchema.optional(),
  stage: pipelineStageSchema.optional(),
  tag: z.string().trim().max(32).optional(),
  cursor: z.number().int().min(0).optional(),
  limit: z.number().int().min(1).max(48).optional(),
});

export const buildCommentSchema = z.object({
  buildId: z.string().uuid(),
  body: z.string().trim().min(1).max(1200),
});
