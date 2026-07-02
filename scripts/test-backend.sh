#!/usr/bin/env bash
# Führt die Backend-Testsuite über die vorhandene Docker-Umgebung aus – gegen den
# aktuellen WORKING TREE, nicht gegen den ins Image gebackenen Stand.
#
# Warum so: In dieser Umgebung gibt es kein Host-venv und kein Host-Postgres. Wir
# starten einen Wegwerf-Container aus dem backend-Image (hat alle Laufzeit-Deps),
# mounten aber das lokale ./backend über /app, damit pytest den aktuellen Code +
# tests/ sieht. Postgres kommt aus dem laufenden db-Container (Test-DB
# geratehaus_test). pytest wird nur ephemer nachinstalliert; das Prod-Image bleibt
# unverändert schlank.
#
# Voraussetzung: db-Container läuft (`docker compose up -d`).
# Nutzung:  scripts/test-backend.sh            # ganze Suite
#           scripts/test-backend.sh -k barcode # pytest-Argumente durchreichen
set -euo pipefail
cd "$(dirname "$0")/.."

# Test-DB anlegen, falls sie noch nicht existiert (idempotent).
docker compose exec -T db sh -c \
  'psql -U "$POSTGRES_USER" -tc "SELECT 1 FROM pg_database WHERE datname='\''geratehaus_test'\''" | grep -q 1 \
   || psql -U "$POSTGRES_USER" -c "CREATE DATABASE geratehaus_test"'

# Wegwerf-Container aus dem backend-Image, aber mit lokalem ./backend als /app
# (Working Tree). DATABASE_URL wird aus den Container-eigenen POSTGRES_*-Variablen
# gebaut (kein Secret im Klartext).
docker compose run --rm -T --no-deps --entrypoint sh \
  -v "$(pwd)/backend:/app" \
  backend -c \
  'pip install -q pytest pytest-asyncio 2>/dev/null || true
   DATABASE_URL="postgresql+asyncpg://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/geratehaus_test" \
   exec python -m pytest "$@"' _ "$@"
