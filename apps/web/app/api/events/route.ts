// Realtime feed updates: Postgres LISTEN/NOTIFY → SSE
// (docs/PRD.md §9, docs/BUILD_PLAN.md Phase 2).
//
// Mutations call notifyActivity(), which issues pg_notify on the
// `buzz_activity` channel. This route holds a LISTEN connection and
// forwards each payload to the browser as an SSE message.
//
// Not every managed Postgres exposes LISTEN/NOTIFY on every connection
// mode, so if LISTEN fails to establish, the route degrades to polling
// post_events instead of dying. The client can't tell the difference.

import { desc, gt } from "drizzle-orm";
import { db, postEvents, posts, sql as rawSql, ACTIVITY_CHANNEL } from "@buzz/db";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const POLL_INTERVAL_MS = 5_000;
const HEARTBEAT_MS = 25_000;

export async function GET(request: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      let unlisten: (() => Promise<void>) | null = null;
      let pollTimer: ReturnType<typeof setInterval> | null = null;
      let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
      let lastSeen = new Date();

      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
          );
        } catch {
          closed = true;
        }
      };

      const cleanup = async () => {
        if (closed) return;
        closed = true;
        if (pollTimer) clearInterval(pollTimer);
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        if (unlisten) await unlisten().catch(() => undefined);
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      request.signal.addEventListener("abort", () => void cleanup());

      // Poll post_events for anything newer than the last thing we sent.
      // Doubles as the fallback path and as a safety net for a NOTIFY that
      // arrived while the connection was briefly down.
      const drainRecent = async () => {
        if (closed) return;
        try {
          const rows = await db
            .select({
              id: postEvents.id,
              postId: postEvents.postId,
              toStatus: postEvents.toStatus,
              createdAt: postEvents.createdAt,
              title: posts.title,
              category: posts.category,
              isAnonymous: posts.isAnonymous,
            })
            .from(postEvents)
            .innerJoin(posts, eq(posts.id, postEvents.postId))
            .where(gt(postEvents.createdAt, lastSeen))
            .orderBy(desc(postEvents.createdAt))
            .limit(10);

          for (const row of rows.reverse()) {
            if (row.createdAt && row.createdAt > lastSeen) {
              lastSeen = row.createdAt;
            }
            send("activity", {
              id: row.id,
              postId: row.postId,
              // Sensitive reports never carry their title off the server.
              title: row.isAnonymous ? "A sensitive report moved" : row.title,
              category: row.category,
              toStatus: row.toStatus,
              createdAt: row.createdAt,
            });
          }
        } catch {
          // A failed poll shouldn't tear the stream down; try again next tick.
        }
      };

      send("ready", { at: new Date().toISOString(), transport: "connecting" });

      try {
        const subscription = await rawSql.listen(ACTIVITY_CHANNEL, (payload) => {
          try {
            send("activity", JSON.parse(payload));
          } catch {
            send("activity", { raw: payload });
          }
        });
        unlisten = subscription.unlisten;
        send("ready", { at: new Date().toISOString(), transport: "listen" });
      } catch {
        send("ready", { at: new Date().toISOString(), transport: "poll" });
      }

      // Runs in both modes — cheap, indexed, and it closes the gap where a
      // NOTIFY fires between connections.
      pollTimer = setInterval(() => void drainRecent(), POLL_INTERVAL_MS);

      // Keeps proxies from closing an idle connection.
      heartbeatTimer = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(": keep-alive\n\n"));
        } catch {
          void cleanup();
        }
      }, HEARTBEAT_MS);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
