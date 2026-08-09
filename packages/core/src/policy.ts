// packages/core/policy.ts
//
// RBAC enforced at the query layer, not just the UI (docs/PRD.md §11).
// Every read path that can surface a post composes `visiblePostsFilter()`
// into its WHERE clause, and every serialised post goes through
// `redactPost()` on the way out. Hiding a row in a component is not access
// control — if it left the database, it leaked.

import { and, eq, or, sql, type SQL } from "drizzle-orm";
import { posts, type Post, type Role, type User } from "@buzz/db";

export type Viewer = {
  id: string;
  role: Role;
  department?: string | null;
} | null;

/**
 * A sensitive Campus report is visible to its author and to Safety Officers.
 * Nobody else — explicitly including platform admins, who can administer
 * every other corner of the system.
 */
export function visiblePostsFilter(viewer: Viewer): SQL | undefined {
  if (viewer?.role === "safety") return undefined;

  const notSensitive = eq(posts.isAnonymous, false);
  if (!viewer) return notSensitive;

  return or(notSensitive, eq(posts.authorId, viewer.id));
}

export function canSeePost(post: Pick<Post, "isAnonymous" | "authorId">, viewer: Viewer): boolean {
  if (!post.isAnonymous) return true;
  if (!viewer) return false;
  return viewer.role === "safety" || post.authorId === viewer.id;
}

export function canSeeAuthorIdentity(
  post: Pick<Post, "isAnonymous" | "authorId">,
  viewer: Viewer,
): boolean {
  if (!post.isAnonymous) return true;
  if (!viewer) return false;
  return viewer.role === "safety" || post.authorId === viewer.id;
}

export type AuthorSummary = {
  id: string | null;
  name: string;
  department: string | null;
  anonymous: boolean;
};

/**
 * Strip the author off a sensitive report. Returns a stable placeholder
 * rather than null so the UI never has to special-case a missing author.
 */
export function redactAuthor(
  post: Pick<Post, "isAnonymous" | "authorId">,
  author: Pick<User, "id" | "name" | "department"> | null,
  viewer: Viewer,
): AuthorSummary {
  if (!canSeeAuthorIdentity(post, viewer)) {
    return {
      id: null,
      name: "Anonymous report",
      department: null,
      anonymous: true,
    };
  }
  return {
    id: author?.id ?? null,
    name: author?.name ?? "Unknown",
    department: author?.department ?? null,
    anonymous: post.isAnonymous,
  };
}

/** Can this person act on the Campus staff queue for a given department? */
export function isStaffFor(viewer: Viewer, department?: string | null): boolean {
  if (!viewer) return false;
  if (viewer.role === "admin") return true;
  if (viewer.role !== "staff") return false;
  if (!department) return true;
  return viewer.department === department;
}

export function isAdmin(viewer: Viewer): boolean {
  return viewer?.role === "admin";
}

/** Admin console scoping — which category dashboards a role may open. */
export function canOpenAdminConsole(viewer: Viewer, category: string): boolean {
  if (!viewer) return false;
  if (viewer.role === "admin") return true;
  if (viewer.role === "staff" && category === "campus") return true;
  if (viewer.role === "mentor" && category === "builds") return true;
  if (viewer.role === "safety" && category === "campus") return true;
  return false;
}

/** The staff queue: Campus posts scoped to this staff member's department. */
export function staffQueueFilter(viewer: Viewer): SQL | undefined {
  if (!viewer || (viewer.role !== "staff" && viewer.role !== "admin")) {
    return undefined;
  }
  const base = eq(posts.category, "campus");
  if (viewer.role === "admin" || !viewer.department) return base;

  // Department is carried on the post's metadata when staff triage it, and
  // otherwise inferred from the reporting author's department.
  return and(
    base,
    or(
      sql`${posts.metadata}->>'department' = ${viewer.department}`,
      sql`${posts.metadata}->>'department' IS NULL`,
    ),
  );
}
