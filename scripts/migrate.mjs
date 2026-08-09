// Applies pending migrations. Plain JavaScript on purpose: this is what the
// production container runs at boot, where there's no TypeScript toolchain.
//
//   local:      npm run db:migrate
//   container:  node migrate.mjs   (see Dockerfile)
//
// Safe to run on every deploy — drizzle records what it has applied and
// skips it, so a redeploy with no schema change is a no-op.

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

// Mirrors resolveSsl() in packages/db/src/client.ts. Kept in sync by hand
// because this file has to run without the TypeScript packages present.
function resolveSsl(connectionString) {
  const override = process.env.DATABASE_SSL?.trim().toLowerCase();
  if (override === "disable" || override === "false") return false;
  if (override === "require" || override === "true") return "require";

  let host = "";
  let sslmode = "";
  try {
    const url = new URL(connectionString);
    host = url.hostname;
    sslmode = url.searchParams.get("sslmode")?.toLowerCase() ?? "";
  } catch {
    return "require";
  }

  if (sslmode === "disable" || sslmode === "allow") return false;
  if (sslmode) return "require";

  const isLoopback =
    host === "localhost" || host === "127.0.0.1" || host === "::1";
  const isPrivateServiceName = !host.includes(".");
  const isInternalTld =
    host.endsWith(".internal") ||
    host.endsWith(".local") ||
    host.endsWith(".railway.internal") ||
    host.endsWith(".flycast");

  return isLoopback || isPrivateServiceName || isInternalTld ? false : "require";
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set — nothing to migrate against.");
  process.exit(1);
}

// Next to this file in the container image, or in the repo when run locally.
const candidates = [
  resolve(here, "migrations"),
  resolve(here, "../packages/db/migrations"),
];
const migrationsFolder = candidates.find((path) => existsSync(path));

if (!migrationsFolder) {
  console.error(`No migrations folder found. Looked in:\n  ${candidates.join("\n  ")}`);
  process.exit(1);
}

const client = postgres(url, { max: 1, ssl: resolveSsl(url) });

try {
  await migrate(drizzle(client), { migrationsFolder });
  console.log("✔ migrations applied");
} catch (error) {
  console.error("✘ migration failed:", error.message);
  process.exitCode = 1;
} finally {
  await client.end({ timeout: 5 }).catch(() => {});
}
