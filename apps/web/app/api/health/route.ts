// Health check for the platform's process supervisor (Coolify, Docker,
// a load balancer). Deliberately checks the DATABASE too: a Buzz instance
// that can serve HTML but can't reach Postgres is not healthy, and a green
// check on "the process is up" would hide exactly the failure you most want
// to catch during a deploy.

import { sql } from "@buzz/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();

  try {
    await sql`SELECT 1`;
    return Response.json(
      {
        status: "ok",
        database: "reachable",
        latencyMs: Date.now() - startedAt,
        at: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return Response.json(
      {
        status: "degraded",
        database: "unreachable",
        // The message names the host and port, which is the thing you
        // actually need when a deploy won't come up.
        error: error instanceof Error ? error.message : "unknown error",
        at: new Date().toISOString(),
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
