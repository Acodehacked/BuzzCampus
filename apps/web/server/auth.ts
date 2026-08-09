// Auth.js (NextAuth v5) — campus-email restricted credentials auth with
// the five roles from packages/db/schema.ts.
//
// JWT session strategy, so no adapter tables are needed on top of the
// shared schema. The role and department ride on the token and are
// re-read from the database on sign-in, so a role change takes effect on
// the user's next sign-in rather than requiring a deploy.

import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare, hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, users, wallets, type Role } from "@buzz/db";
import { grantStarterCredits, isCampusEmail, loginSchema } from "@buzz/core";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      department: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role?: Role;
    department?: string | null;
  }
}

export const BCRYPT_ROUNDS = 11;

export function hashPassword(password: string) {
  return hash(password, BCRYPT_ROUNDS);
}

/**
 * Create a user, their wallet, and their starter credit grant — one path,
 * used by both the register procedure and the seed script, so the grant
 * can't be forgotten in one of them (docs/BUILD_PLAN.md Phase 4).
 */
export async function createUser(input: {
  name: string;
  email: string;
  password?: string;
  role?: Role;
  department?: string | null;
}) {
  const email = input.email.trim().toLowerCase();

  if (!isCampusEmail(email)) {
    throw new Error("Buzz is campus-only — use your institutional email");
  }

  return db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({
        name: input.name.trim(),
        email,
        passwordHash: input.password ? await hashPassword(input.password) : null,
        role: input.role ?? "student",
        department: input.department ?? null,
      })
      .returning();

    if (!user) throw new Error("Could not create that account");

    // Wallet starts empty; the starter credits arrive as a real ledger
    // entry rather than a magic default, so the balance always reconciles.
    await tx.insert(wallets).values({ userId: user.id, balance: "0.00" });
    await grantStarterCredits(user.id, tx as never);

    return user;
  });
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  pages: { signIn: "/login", error: "/login" },
  trustHost: true,
  providers: [
    Credentials({
      name: "Campus email",
      credentials: {
        email: { label: "Campus email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (!user?.passwordHash) return null;

        const valid = await compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
        };
      },
    }),
  ],
  callbacks: {
    // Second gate on the campus restriction — the register procedure is the
    // first. Enforced server-side both times.
    signIn({ user }) {
      return Boolean(user.email && isCampusEmail(user.email));
    },
    jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.role = user.role ?? "student";
        token.department = user.department ?? null;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.uid as string) ?? "";
        session.user.role = (token.role as Role) ?? "student";
        session.user.department = (token.department as string | null) ?? null;
      }
      return session;
    },
  },
});
