#!/usr/bin/env bash
# Führt die Backend-Testsuite über die vorhandene Docker-Umgebung aus.
#
# Warum so: In dieser Umgebung gibt es kein Host-venv und kein Host-Postgres.
# Der backend-Container enthält bereits alle Laufzeit-Abhängigkeiten und den
# Quellcode inkl. tests/. Wir nutzen die laufende db-Container-Postgres (eigene
# Test-DB `geratehaus_test`) und installieren pytest nur ephemer im laufenden
# backend-Container – das Prod-Image bleibt unverändert schlank.
#
# Voraussetzung: Container laufen (`docker compose up -d`).
# Nutzung:  scripts/test-backend.sh            # ganze Suite
#           scripts/test-backend.sh -k barcode # pytest-Argumente durchreichen
set -euo pipefail
cd "$(dirname "$0")/.."

# Test-DB anlegen, falls sie noch nicht existiert (idempotent).
docker compose exec -T db sh -c \
  'psql -U "$POSTGRES_USER" -tc "SELECT 1 FROM pg_database WHERE datname='\''geratehaus_test'\''" | grep -q 1 \
   || psql -U "$POSTGRES_USER" -c "CREATE DATABASE geratehaus_test"'

# pytest im backend-Container gegen die Test-DB. DATABASE_URL wird aus den im
# Container vorhandenen POSTGRES_*-Variablen gebaut (kein Secret im Klartext).
docker compose exec -T backend sh -c \
  'pip install -q pytest pytest-asyncio 2>/dev/null || true
   DATABASE_URL="postgresql+asyncpg://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/geratehaus_test" \
   exec python -m pytest "$@"' _ "$@"
