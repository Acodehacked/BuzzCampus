#!/bin/sh
# Runs migrations, then hands off to the server.
#
# Migrations run on every boot on purpose. Drizzle records what it has
# already applied, so a redeploy with no schema change costs one query — and
# the alternative (remembering to run them by hand) is the thing that
# actually breaks deploys.
#
# Set RUN_MIGRATIONS=false to skip, e.g. when several instances boot at once
# and you'd rather run migrations from a single job first.

set -e

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "→ applying database migrations"
  node ./migrate.mjs
else
  echo "→ RUN_MIGRATIONS=false, skipping migrations"
fi

echo "→ starting Buzz on port ${PORT:-3000}"
exec "$@"
