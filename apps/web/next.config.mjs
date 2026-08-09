import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Next only reads .env files from the app directory, but this is a
// monorepo — the database URL and auth secret are shared with the seed
// script, the migrations and the tests, so they live in one .env at the
// workspace root. Loading it here populates process.env before the server
// boots, for `next dev`, `next build` and `next start` alike.
const here = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(here, "../../.env") });
config({ path: resolve(here, ".env.local") });

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Emits a self-contained server bundle at .next/standalone, which is what
  // the production Docker image runs. Without this the image would need the
  // whole node_modules tree.
  output: "standalone",
  // Tracing has to start at the workspace root, or the standalone bundle
  // misses packages/db, packages/core and packages/ui.
  outputFileTracingRoot: resolve(here, "../.."),
  // The workspace packages ship TypeScript source, so Next compiles them
  // with the app rather than expecting a prebuilt dist.
  transpilePackages: ["@buzz/ui", "@buzz/core", "@buzz/db"],
  experimental: {
    serverActions: { bodySizeLimit: "4mb" },
  },
  // Keep the Postgres driver and bcrypt out of the bundler — they need
  // node:tls, node:fs and friends at runtime.
  serverExternalPackages: ["postgres", "bcryptjs"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
