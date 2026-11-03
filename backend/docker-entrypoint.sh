#!/bin/sh
set -e

echo "⏳ Applying Prisma migrations…"
attempt=1
until npx prisma migrate deploy; do
  if [ "$attempt" -ge 15 ]; then
    echo "❌ No se pudo aplicar las migraciones después de $attempt intentos."
    exit 1
  fi
  echo "   Base de datos no disponible todavía. Reintento $attempt/15…"
  attempt=$((attempt + 1))
  sleep 2
done

if [ "${RUN_SEED:-true}" = "true" ]; then
  echo "🌱 Seeding demo data (idempotent)…"
  npx ts-node prisma/seed.ts || echo "⚠️  Seed omitido o ya aplicado."
fi

echo "🚀 Starting Sakila Payment Gateway API…"
exec node dist/main
