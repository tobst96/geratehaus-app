#!/usr/bin/env bash
#
# Host-seitiger Updater für Gerätehaus.app.
#
# Der Backend-Container hat bewusst KEINEN Zugriff auf Docker/Git des Hosts.
# Wenn ein Admin auf der Update-Seite „Update installieren" klickt, erstellt das
# Backend zuerst ein Backup und schreibt danach eine Markerdatei (Ziel-Git-Tag +
# Zeitstempel) in den per Bind-Mount geteilten Ordner ./update-signal (im
# Container: /app/update-signal). Dieses Skript läuft auf dem HOST, beobachtet
# den Marker und führt das eigentliche Update aus.
#
# Einrichtung (einmalig), z. B. als Minuten-Cronjob des Deploy-Users:
#   * * * * * /pfad/zu/geratehaus-app/scripts/updater.sh >> /var/log/geratehaus-updater.log 2>&1
# Alternativ als systemd .path + .service Unit, die auf die Markerdatei triggert.
#
# Voraussetzungen: git, docker (compose) und Schreibrechte im Repo-Verzeichnis
# für den ausführenden User.
#
# Wichtig: Das Skript checkt den vom Backend übergebenen Git-TAG explizit aus
# (git fetch + checkout --force), statt nur "git pull --ff-only" auf dem
# aktuell ausgecheckten Branch zu machen. Das behebt zwei Probleme der alten
# Variante: (1) ein Kanalwechsel Stable↔Beta in der UI hatte keinerlei Effekt,
# weil "pull" nie den Branch/Tag wechselt, nur den aktuellen vorwärtsbewegt;
# (2) "pull --ff-only" schlägt lautlos fehl (nur im Log sichtbar), sobald der
# Host-Checkout kein sauberer Fast-Forward mehr ist (z. B. weil er auf einem
# Tag statt einem Branch steht) – für den Admin sah das wie "Klick tut nichts"
# aus. Ein expliziter Tag-Checkout funktioniert unabhängig vom bisherigen
# Zustand des Host-Checkouts.

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MARKER="$REPO_DIR/update-signal/update-requested"

cd "$REPO_DIR"

# Nur aktiv werden, wenn eine Update-Anforderung vorliegt.
[ -f "$MARKER" ] || exit 0

ZIEL_TAG="$(head -n 1 "$MARKER" 2>/dev/null || echo '')"

# Marker zuerst entfernen, damit ein erneuter Klick sauber neu triggern kann und
# ein fehlgeschlagener Lauf nicht in einer Endlosschleife hängen bleibt.
rm -f "$MARKER"

if [ -z "$ZIEL_TAG" ]; then
  echo "[updater $(date -Is)] Marker ohne Ziel-Tag gefunden - abgebrochen."
  exit 1
fi

echo "[updater $(date -Is)] Update angefordert (Ziel-Tag: ${ZIEL_TAG}) - starte."

git fetch --all --tags --prune
git checkout --force "$ZIEL_TAG"

# --profile minio: der optionale MinIO-Objektspeicher soll beim Update weiterlaufen.
docker compose --profile minio up -d --build

echo "[updater $(date -Is)] Update auf ${ZIEL_TAG} abgeschlossen."
