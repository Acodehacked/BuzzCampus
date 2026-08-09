// Pure formatting helpers, deliberately in a module WITHOUT "use client".
//
// These used to live in PostCard.tsx, which is a Client Component — and
// anything exported from a "use client" module becomes a client reference,
// so a Server Component calling it fails at runtime rather than at build.
// Keeping them here means both sides can use the same function.

/** "just now" · "12m ago" · "3h ago" · "5d ago" · "12 Mar" */
export function relativeTime(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";

  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/** "12 Mar, 14:05" — for audit-trail timestamps, which are set in mono. */
export function formatStamp(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
