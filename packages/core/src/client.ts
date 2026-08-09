// packages/core/client — the isomorphic half of packages/core.
//
// Everything exported here is pure: constants, money arithmetic, the Zod
// schemas, and the SLA maths. No database, no drivers. Client Components
// import from `@buzz/core/client`; server code imports from `@buzz/core`,
// which re-exports all of this plus the parts that talk to Postgres.
//
// The split is load-bearing, not cosmetic. The root barrel reaches
// lifecycle → ledger → @buzz/db → postgres-js, so a Client Component
// importing one Zod schema from it would drag the database driver into the
// browser bundle — which is exactly the build failure this file fixes.
//
// The modules below import from @buzz/db only with `import type`, which
// TypeScript erases, so no runtime dependency comes with them.

export * from "./constants";
export * from "./errors";
export * from "./money";
export * from "./sla";
export * from "./validation";
