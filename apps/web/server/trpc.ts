// tRPC server setup — context, error mapping and the procedure ladder.
//
// The route handlers in apps/web contain no business logic: every procedure
// here validates with a Zod schema from packages/core and then calls a
// packages/core function (docs/ARCHITECTURE.md, package boundary rules).

import { initTRPC, TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import superjson from "superjson";
import { ZodError } from "zod";
import { db, users, type Role } from "@buzz/db";
import { BuzzError, canOpenAdminConsole, type Viewer } from "@buzz/core";
import { auth } from "./auth";

export type Context = {
  db: typeof db;
  viewer: Viewer;
  headers: Headers;
};

/**
 * Resolves the viewer from the session token, then confirms against the
 * database.
 *
 * The extra lookup is one indexed primary-key read, and it buys two things
 * a JWT alone can't give: a token for a user who no longer exists is
 * treated as signed out rather than as a ghost who can read pages but
 * fails every write, and a role change takes effect on the next request
 * instead of the next sign-in — which matters when the role being revoked
 * is `admin` or `safety`.
 */
export async function createContext(opts: { headers: Headers }): Promise<Context> {
  const session = await auth();

  let viewer: Viewer = null;

  if (session?.user?.id) {
    const [current] = await db
      .select({
        id: users.id,
        role: users.role,
        department: users.department,
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    viewer = current ?? null;
  }

  return { db, viewer, headers: opts.headers };
}

const BUZZ_TO_TRPC: Record<BuzzError["code"], TRPCError["code"]> = {
  NOT_FOUND: "NOT_FOUND",
  FORBIDDEN: "FORBIDDEN",
  INVALID_TRANSITION: "CONFLICT",
  INSUFFICIENT_CREDITS: "BAD_REQUEST",
  CONFLICT: "CONFLICT",
  BAD_REQUEST: "BAD_REQUEST",
};

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const router = t.router;
export const createCallerFactory = t.createCallerFactory;

/**
 * Translates packages/core's transport-agnostic BuzzError into the right
 * tRPC code, so a domain rule ("you can't accept your own Ask") reaches the
 * client as a readable message rather than a 500.
 */
const domainErrors = t.middleware(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error instanceof BuzzError) {
      throw new TRPCError({
        code: BUZZ_TO_TRPC[error.code] ?? "BAD_REQUEST",
        message: error.message,
        cause: error,
      });
    }
    throw error;
  }
});

export const publicProcedure = t.procedure.use(domainErrors);

export const protectedProcedure = publicProcedure.use(({ ctx, next }) => {
  if (!ctx.viewer) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Sign in with your campus email to do that",
    });
  }
  return next({ ctx: { ...ctx, viewer: ctx.viewer } });
});

/** Role gate — RBAC at the query layer, not the component (docs/PRD.md §11). */
export function roleProcedure(...roles: Role[]) {
  return protectedProcedure.use(({ ctx, next }) => {
    if (!roles.includes(ctx.viewer!.role)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Your role doesn't have access to that",
      });
    }
    return next({ ctx });
  });
}

export const adminProcedure = roleProcedure("admin");

/** Category-scoped admin console access (staff → campus, mentor → builds). */
export function adminConsoleProcedure(category: string) {
  return protectedProcedure.use(({ ctx, next }) => {
    if (!canOpenAdminConsole(ctx.viewer, category)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Your role doesn't have access to that console",
      });
    }
    return next({ ctx });
  });
}
