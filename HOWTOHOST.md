# Hosting Buzz

Running it locally, and deploying it to a Coolify server.

Buzz is a Next.js app plus a PostgreSQL database. Nothing else — no Redis, no
queue, no object store. If you can run a Node process and a Postgres, you can
run Buzz.

---

# Part 1 — Local

## Prerequisites

- **Node 20.11+** (`node -v`)
- **Docker Desktop**, for Postgres. If you already have Postgres installed you
  can skip Docker entirely — just point `DATABASE_URL` at it.

## First run

```bash
npm install

cp .env.example .env
```

Open `.env` and set two things:

```bash
# 1. A real secret
AUTH_SECRET=<paste the output of the command below>

# 2. Your college's email domain (subdomains are included automatically)
CAMPUS_EMAIL_DOMAINS=buzzcampus.edu,sjcetpalai.ac.in
```

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Keep `buzzcampus.edu` in the list while you're developing — the seeded demo
accounts live there and you won't be able to sign in as them otherwise.

Then:

```bash
docker compose up -d     # Postgres on 5432, throwaway test DB on 5433
npm run db:migrate       # create the tables

npm run db:seed          # a campus with a month of history in it
npm run dev              # http://localhost:3000
```

Sign in as `aisha@buzzcampus.edu` / `buzz1234`. Other roles are listed in the
README.

## Day to day

| Command | |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm test` | 100 tests (9 of them against the test database) |
| `npm run db:studio` | Browse the data in Drizzle Studio |
| `npm run db:seed` | Wipe and reseed — **destroys all local data** |
| `docker compose down` | Stop Postgres, keep the data |
| `docker compose down -v` | Stop Postgres and delete the data |

### After changing `packages/db/src/schema.ts`

```bash
npm run db:generate    # writes a new SQL file to packages/db/migrations
npm run db:migrate     # applies it
```

Commit the generated migration. Production applies it automatically on the
next deploy.

## Testing the production build locally

Worth doing before you deploy, because it catches things `next dev` doesn't:

```bash
npm run build
npm run start           # http://localhost:3000
```

## Running the real Docker image locally

This is byte-for-byte what Coolify will run:

```bash
docker build -t buzz .

docker run --rm -p 3000:3000 \
  -e DATABASE_URL="postgresql://buzz:buzz@host.docker.internal:5432/buzz" \
  -e AUTH_SECRET="$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")" \
  -e CAMPUS_EMAIL_DOMAINS="buzzcampus.edu" \
  buzz
```

`host.docker.internal` is how the container reaches Postgres running on your
machine — it works on Docker Desktop for Windows and macOS. On Linux, add
`--add-host=host.docker.internal:host-gateway`.

The container applies migrations before starting; you'll see
`→ applying database migrations` in the logs.

---

# Part 2 — Coolify

## What you need

- A VPS with [Coolify](https://coolify.io) installed (1GB RAM is tight but
  workable; 2GB is comfortable).
- This repository on GitHub/GitLab, or any Git URL Coolify can reach.
- A domain or subdomain pointed at the server's IP — an `A` record for
  `buzz.yourcollege.edu` → your server. Do this first; DNS takes a few
  minutes to propagate and Coolify needs it to issue the certificate.

## Step 1 — Create the project

In Coolify: **Projects → + New → Project**. Name it `buzz`. It comes with a
`production` environment.

## Step 2 — Add the database first

The app needs the database's connection string, so create it first.

**+ New Resource → Database → PostgreSQL**.

- Version: **17** (matches `docker-compose.yml` locally)
- Name: `buzz-db`
- Leave the generated username and password alone

Click **Start**. When it's running, open it and copy the
**Postgres URL (internal)**. It looks like:

```
postgres://postgres:SOME_PASSWORD@postgresql-abc123def:5432/postgres
```

That hostname is a private Docker network name — only reachable from other
containers in the same Coolify project, which is exactly what you want. Do
**not** expose the database publicly.

> **Enable backups now, not later.** Open the database → **Backups** → add a
> scheduled backup. Buzz's whole value is a record of what a campus did; it
> should not live on one unbacked disk.

## Step 3 — Add the application

**+ New Resource → Application → Public Repository** (or connect your GitHub
app for private repos and automatic deploys on push).

| Setting | Value |
|---|---|
| Repository URL | your repo |
| Branch | `main` |
| **Build Pack** | **Dockerfile** |
| Dockerfile Location | `/Dockerfile` |
| Base Directory | `/` |
| Ports Exposes | `3000` |

Under **Network**, set your domain: `https://buzz.yourcollege.edu`. Coolify
provisions a Let's Encrypt certificate through its proxy automatically — you
don't configure TLS in the app.

Under **Health Checks**, enable it and set:

| Setting | Value |
|---|---|
| Path | `/api/health` |
| Port | `3000` |
| Interval / Timeout | `30` / `5` |

`/api/health` checks Postgres as well as the process, so a deploy that comes
up without a working database is correctly reported as failed rather than
going green and serving errors.

## Step 4 — Environment variables

**Environment Variables** tab.

> ### Leave "Build Variable" UNCHECKED on every one of these
>
> This matters for two separate reasons, and getting it wrong is the most
> common way this deploy fails.
>
> **It breaks the build.** Coolify injects an `ARG` line for every build
> variable into *each stage* of the Dockerfile, and `ARG` values are visible
> to `RUN`. If `NODE_ENV=production` is among them, npm reads it as
> `--omit=dev` and `npm ci` silently skips devDependencies — then the build
> dies with `Cannot find module 'tailwindcss'`. Tailwind, PostCSS and
> Autoprefixer are all dev dependencies of a Next app. (The Dockerfile now
> pins `npm ci --include=dev` so this can't happen, but there's no reason to
> invite it.)
>
> **It leaks secrets.** Build arguments are recorded in the image's layer
> history. Anyone who can pull the image can read `AUTH_SECRET` and
> `DATABASE_URL` back out of it. Docker warns about this during the build:
> `SecretsUsedInArgOrEnv: Do not use ARG or ENV instructions for sensitive
> data`. If you have already deployed with `AUTH_SECRET` as a build
> variable, **rotate it** — generate a new one, uncheck the box, redeploy.
> Everyone gets signed out, which is the point.
>
> Nothing secret is needed to build this image. The database is only touched
> at runtime.

```bash
# Paste the INTERNAL url from step 2
DATABASE_URL=postgres://postgres:SOME_PASSWORD@postgresql-abc123def:5432/postgres

# Generate a NEW one — do not reuse your local secret
AUTH_SECRET=<node -e "console.log(require('crypto').randomBytes(32).toString('base64'))">

# Your public URL, exactly as entered in step 3
NEXT_PUBLIC_APP_URL=https://buzz.yourcollege.edu

# Who is allowed to sign up. Subdomains included:
# sjcetpalai.ac.in also admits es.sjcetpalai.ac.in
CAMPUS_EMAIL_DOMAINS=sjcetpalai.ac.in

# Auth.js sits behind Coolify's proxy
AUTH_TRUST_HOST=true
```

You do **not** need to set `PORT` — Coolify sets it, and the image defaults to
3000.

You do **not** normally need `DATABASE_SSL`. The client infers it: a hostname
with no dot (like `postgresql-abc123def`) is a private service name, so it
connects without TLS. Set `DATABASE_SSL=require` if you ever point
`DATABASE_URL` at an external managed database that doesn't already carry
`?sslmode=require`.

## Step 5 — Deploy

Hit **Deploy**. The first build takes a few minutes; later ones are faster
because the dependency layer caches.

Watch the logs. A healthy start looks like:

```
→ applying database migrations
✔ migrations applied
→ starting Buzz on port 3000
  ▲ Next.js 15.x
  ✓ Ready
```

Then open `https://buzz.yourcollege.edu`. You should get the landing page with
an empty feed, because a fresh production database has no posts in it.

## Step 6 — Create the first account

Go to `/register` and sign up with an address on your allowed domain. That
account is a `student` like any other.

To make yourself an admin, open the database in Coolify (**buzz-db →
Terminal**, or `Execute Command`) and run:

```sql
UPDATE users SET role = 'admin' WHERE email = 'you@yourcollege.edu';
```

Roles are `student`, `staff`, `admin`, `safety`, `mentor`. The change takes
effect on your next request — Buzz reads the role from the database rather
than the session token, precisely so revoking access is immediate.

From then on you can set other people's roles from `/admin`.

---

## Seeding a demo deployment

**Don't seed a real deployment** — `npm run db:seed` deletes every row first.

For a demo or competition instance where fake data is the point, the
production container can't seed itself (the seed script is TypeScript and the
runtime image has no toolchain). Run it from your machine against the remote
database instead:

1. In Coolify, open `buzz-db` and temporarily set a **Public Port** (e.g.
   5432). Coolify shows you a public connection URL.
2. Locally:

   ```bash
   DATABASE_URL="postgres://postgres:PASSWORD@your-server-ip:5432/postgres" \
   SEED_EMAIL_DOMAIN="yourcollege.edu" \
     npm run db:seed
   ```

3. **Remove the public port again.** An internet-facing Postgres is not
   something to leave switched on.

---

## Operating it

**Deploying an update.** Push to `main`. With the GitHub app connected,
Coolify redeploys automatically; otherwise press **Redeploy**. Migrations
apply on boot, so a schema change ships with the code that needs it.

**Rolling back.** Coolify keeps previous deployments — open **Deployments**
and redeploy an earlier one. Note that this rolls back *code only*: a
migration that has run has run. If a release changes the schema
destructively, take a backup before deploying it.

**Logs.** The application's **Logs** tab is the running container's stdout.
tRPC procedure errors are logged in full only in development; in production
they reach the client as a message and a code, which is deliberate.

**Scaling past one instance.** The app itself is stateless — sessions are
JWTs, so any instance can serve any request. Two things to know:

- Set `RUN_MIGRATIONS=false` on the extra instances and run migrations once
  from a single job. Several containers racing the same migration at boot is
  asking for trouble.
- The live-activity SSE stream holds one Postgres `LISTEN` connection per
  instance. That's fine, but it counts against `max_connections`.

**Resource use.** One instance idles at roughly 150–250MB. The Postgres
container wants ~100MB plus your data.

---

## When it doesn't work

**Deploy succeeds, site shows 500.** Check `/api/health`. If it reports
`"database": "unreachable"`, the message names the host it tried — nearly
always a `DATABASE_URL` typo, or the internal URL copied from a database in a
*different* Coolify project (the private network is per-project).

**`no pg_hba.conf entry ... no encryption` or a TLS handshake error.** The
app is trying to speak TLS to a database that doesn't offer it. Set
`DATABASE_SSL=disable`, or append `?sslmode=disable` to `DATABASE_URL`.

**The opposite — `server does not support SSL`, but on a managed provider.**
Set `DATABASE_SSL=require`.

**Sign-in redirects in a loop, or "UntrustedHost".** `AUTH_TRUST_HOST=true`
is missing, or `NEXT_PUBLIC_APP_URL` doesn't match the domain you're actually
visiting (http vs https, or a missing subdomain).

**"Buzz is campus-only" when signing up with a valid address.**
`CAMPUS_EMAIL_DOMAINS` doesn't include that domain. Remember it's a list of
*domains*, comma-separated — subdomains are automatic, so list
`sjcetpalai.ac.in`, not `es.sjcetpalai.ac.in`.

**Build fails with `Cannot find module 'tailwindcss'`** (or `postcss`, or
`autoprefixer`). The build ran without devDependencies. Coolify injects every
**build variable** into each Dockerfile stage as an `ARG`, and if
`NODE_ENV=production` is among them npm reads it as `--omit=dev`. Uncheck
"Build Variable" on your environment variables — none of them are needed at
build time. The Dockerfile also pins `npm ci --include=dev`, so an up-to-date
checkout is immune to this; if you're seeing it, pull the latest `Dockerfile`.

**Build runs out of memory on a small VPS.** Next builds are memory-hungry.
Add swap on the server:

```bash
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
```

**The activity dot in the nav says "idle".** The SSE stream isn't connected.
Buzz falls back to polling and everything still works — but if it's
persistent, a proxy in front of Coolify may be buffering `text/event-stream`.
The route already sends `X-Accel-Buffering: no` for nginx.

---

## Deploying somewhere else

Nothing here is Coolify-specific except the click path. The `Dockerfile`
works on any platform that builds Docker images — Railway, Fly.io, Render,
a bare VPS with `docker run`. Provide the same environment variables and
point `DATABASE_URL` at any PostgreSQL 14+.

For **Vercel**, skip the Dockerfile: import the repo, set the root directory
to `apps/web`, add the same environment variables, and pair it with a Neon
database (`DATABASE_URL` will already carry `?sslmode=require`). Run
`npm run db:migrate` from your machine against the Neon URL before the first
deploy, since Vercel has no boot-time hook.
