# Production image for Buzz. Used by Coolify (Build Pack: Dockerfile) and by
# anything else that speaks Docker.
#
#   docker build -t buzz .
#   docker run -p 3000:3000 -e DATABASE_URL=... -e AUTH_SECRET=... buzz
#
# Three stages so the runtime image carries no compiler, no dev dependencies
# and no source: roughly 200MB instead of well over a gigabyte.

# ── deps ───────────────────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

# Only the manifests, so this layer caches until a dependency actually
# changes — the slowest step shouldn't rerun on every code edit.
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/db/package.json ./packages/db/
COPY packages/core/package.json ./packages/core/
COPY packages/ui/package.json ./packages/ui/

RUN npm ci


# ── builder ────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Nothing secret is needed to build. The database is only touched at
# runtime, and every page that reads it is dynamic — but next.config.mjs
# loads a root .env if one exists, and there won't be one in the image, so
# a placeholder keeps the build from tripping over a missing variable.
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build --workspace=@buzz/web


# ── runner ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Don't run the server as root.
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# The standalone bundle: server.js, the traced node_modules, and the
# compiled workspace packages.
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

# Migrations run at container start (see the entrypoint below), which needs
# the migrator and the SQL files. drizzle-orm and postgres are copied
# explicitly because Next only traces what the app imports, and the app
# never imports the migrator.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/drizzle-orm ./node_modules/drizzle-orm
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/postgres ./node_modules/postgres
COPY --from=builder --chown=nextjs:nodejs /app/packages/db/migrations ./migrations
COPY --from=builder --chown=nextjs:nodejs /app/scripts/migrate.mjs ./migrate.mjs
COPY --from=builder --chown=nextjs:nodejs /app/docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x ./docker-entrypoint.sh

USER nextjs
EXPOSE 3000

# /api/health checks Postgres too, so an instance that can serve HTML but
# can't reach the database is correctly reported as unhealthy.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "apps/web/server.js"]
