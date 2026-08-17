#!/usr/bin/env bash
# Führt die Frontend-Vitest-Suite über die Docker-Umgebung aus.
#
# Warum so: In dieser Umgebung gibt es kein Host-node/-npm mit passenden Rechten –
# das lokale ./frontend/node_modules ist (aus einem Container-Build) root-owned, sodass
# vite/vitest sein `.vite-temp` nicht schreiben kann (EACCES). Wir bauen daher den
# `build`-Stage des Frontend-Images (node:20-alpine + installierte Deps + aktueller
# Code aus dem WORKING TREE, per `COPY . .`) und lassen vitest DARIN laufen – analog zu
# scripts/test-backend.sh.
#
# WICHTIG (Lesson „docker compose run startet die App"): bewusst `docker run --rm` mit
# dem Build-Stage-Image, NICHT `docker compose run` (das würde über den Entrypoint eine
# zweite App-Instanz starten und als Streuner zurückbleiben).
#
# Nutzung:  scripts/test-frontend.sh                     # ganze Suite
#           scripts/test-frontend.sh src/foo.test.tsx    # vitest-Argumente durchreichen
#           scripts/test-frontend.sh -t "lädt Formular"  # nach Testnamen filtern
set -euo pipefail
cd "$(dirname "$0")/.."

# Build-Stage bauen (enthält node + Deps + aktuellen Code). Der darin laufende
# `npm run build` (tsc --noEmit + vite build) ist zugleich ein Typecheck.
docker build --target build -t geratehaus-frontend-test ./frontend

# vitest im Wegwerf-Container ausführen (kein Server, kein Watch-Modus).
docker run --rm -t --entrypoint sh geratehaus-frontend-test -c 'npx vitest run "$@"' _ "$@"
