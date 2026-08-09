import { defineConfig } from "vitest/config";
import { config } from "dotenv";
import { resolve } from "node:path";

// Loads TEST_DATABASE_URL if it's set, which is what decides whether the
// transactional tests run or skip. Absent, `npm test` still passes on a
// fresh clone with no database at all.
config({ path: resolve(__dirname, ".env") });

export default defineConfig({
  test: {
    environment: "node",
    include: ["packages/**/*.{test,spec}.ts"],
    passWithNoTests: false,
    // The DB-backed tests share a schema; running files in parallel would
    // have them stepping on each other's rows.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@buzz/db": resolve(__dirname, "packages/db/src/index.ts"),
      "@buzz/core": resolve(__dirname, "packages/core/src/index.ts"),
      "@buzz/ui": resolve(__dirname, "packages/ui/src/index.ts"),
    },
  },
});
