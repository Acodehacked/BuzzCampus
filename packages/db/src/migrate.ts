// Applies generated drizzle-kit migrations. Run with `npm run db:migrate`.
import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), "../../.env") });
config({ path: resolve(process.cwd(), ".env") });

const { drizzle } = await import("drizzle-orm/postgres-js");
const { migrate } = await import("drizzle-orm/postgres-js/migrator");
const postgres = (await import("postgres")).default;

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set.");

const migrationClient = postgres(url, {
  max: 1,
  ssl: url.includes("localhost") || url.includes("127.0.0.1") ? false : "require",
});

await migrate(drizzle(migrationClient), {
  migrationsFolder: resolve(process.cwd(), "migrations"),
});

console.log("✔ migrations applied");
await migrationClient.end();
