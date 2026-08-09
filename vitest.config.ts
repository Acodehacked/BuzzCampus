import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["packages/**/*.{test,spec}.ts"],
    passWithNoTests: false,
  },
  resolve: {
    alias: {
      "@buzz/db": resolve(__dirname, "packages/db/src/index.ts"),
      "@buzz/core": resolve(__dirname, "packages/core/src/index.ts"),
      "@buzz/ui": resolve(__dirname, "packages/ui/src/index.ts"),
    },
  },
});
