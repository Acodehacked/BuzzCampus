// Registration and the derived notification centre.

import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { users } from "@buzz/db";
import {
  getDailyDigest,
  getNotifications,
  getRecentActivity,
  registerSchema,
} from "@buzz/core";
import { protectedProcedure, publicProcedure, router } from "../trpc";
import { createUser } from "../auth";

export const accountRouter = router({
  register: publicProcedure
    .input(registerSchema)
    .mutation(async ({ ctx, input }) => {
      const email = input.email.toLowerCase();

      const [existing] = await ctx.db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "There's already an account on that email",
        });
      }

      const user = await createUser({
        name: input.name,
        email,
        password: input.password,
        department: input.department,
      });

      return { id: user.id, email: user.email, name: user.name };
    }),

  notifications: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(50).optional() }).optional())
    .query(({ ctx, input }) =>
      getNotifications(ctx.viewer.id, input?.limit ?? 20, ctx.db),
    ),

  /** One item per category — the cross-category nudge, delivered. */
  digest: protectedProcedure.query(({ ctx }) =>
    getDailyDigest(
      { id: ctx.viewer.id, department: ctx.viewer.department },
      ctx.db,
    ),
  ),

  /** Feeds the live-activity pulse in the shell nav. */
  activity: publicProcedure
    .input(z.object({ limit: z.number().int().min(1).max(20).optional() }).optional())
    .query(({ ctx, input }) => getRecentActivity(input?.limit ?? 8, ctx.db)),
});
