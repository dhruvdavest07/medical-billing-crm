#!/bin/sh
set -eu

echo "Applying Prisma migrations..."
npx prisma migrate deploy

if [ "${SEED_DEMO_DATA:-false}" = "true" ]; then
  echo "SEED_DEMO_DATA=true detected. Seeding demo data..."
  node prisma/seed.js
else
  echo "Skipping demo seed. Set SEED_DEMO_DATA=true to provision local/demo credentials."
fi

exec npm run start
