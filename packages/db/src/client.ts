// packages/db/client.ts — the Drizzle client singleton.
//
// postgres-js over a plain TCP connection, so the same code runs against a
// local Postgres and against Neon without a driver swap.
//
// Both `sql` and `db` are lazy Proxies: importing this module never opens a
// connection and never requires DATABASE_URL. That matters in two places —
// Next.js imports server modules during `next build`, and the unit test
// suite imports packages/core without any database at all. The connection
// is established on first actual query.

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  __buzzSql?: postgres.Sql;
  __buzzDb?: ReturnType<typeof drizzle<typeof schema>>;
};

function connect(): postgres.Sql {
  if (globalForDb.__buzzSql) return globalForDb.__buzzSql;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and point it at a Postgres instance.",
    );
  }

  const isLocal =
    connectionString.includes("localhost") ||
    connectionString.includes("127.0.0.1");

  const client = postgres(connectionString, {
    max: process.env.NODE_ENV === "production" ? 10 : 3,
    idle_timeout: 20,
    // Neon and most managed Postgres require TLS; local usually doesn't.
    ssl: isLocal ? false : "require",
  });

  globalForDb.__buzzSql = client;
  return client;
}

function database() {
  if (!globalForDb.__buzzDb) {
    globalForDb.__buzzDb = drizzle(connect(), { schema });
  }
  return globalForDb.__buzzDb;
}

export type Database = ReturnType<typeof database>;

export const sql = new Proxy((() => {}) as unknown as postgres.Sql, {
  get: (_t, prop) => Reflect.get(connect(), prop),
  apply: (_t, _this, args) =>
    (connect() as unknown as (...a: unknown[]) => unknown)(...args),
}) as postgres.Sql;

export const db = new Proxy({} as Database, {
  get: (_t, prop) => Reflect.get(database(), prop),
});

/**
 * Anything that reads or writes inside `transitionPost` / `transferCredits`
 * gets one of these — either the pool or an open transaction. Core functions
 * accept it so they can compose into a single transaction.
 */
export type Executor =
  | Database
  | Parameters<Parameters<Database["transaction"]>[0]>[0];

/**
 * Fire-and-forget realtime signal. The SSE route LISTENs on this channel;
 * if the deployment target doesn't support LISTEN/NOTIFY the route falls
 * back to polling post_events, so a failure here is never fatal.
 */
export async function notifyActivity(payload: {
  kind: "post" | "event" | "ledger" | "build";
  postId?: string;
  buildId?: string;
  category?: string;
  title?: string;
}): Promise<void> {
  try {
    const client = connect();
    await client`SELECT pg_notify('buzz_activity', ${JSON.stringify(payload)})`;
  } catch {
    // Realtime is a nicety; never let it break a mutation.
  }
}

export const ACTIVITY_CHANNEL = "buzz_activity";
