#!/usr/bin/env bash
#
# Host-seitiger Updater für Gerätehaus.app.
#
# Der Backend-Container hat bewusst KEINEN Zugriff auf Docker/Git des Hosts.
# Wenn ein Admin auf der Update-Seite „Update installieren" klickt, schreibt das
# Backend nur eine Markerdatei in den per Bind-Mount geteilten Ordner
# ./update-signal (im Container: /app/update-signal). Dieses Skript läuft auf dem
# HOST, beobachtet den Marker und führt das eigentliche Update aus.
#
# Einrichtung (einmalig), z. B. als Minuten-Cronjob des Deploy-Users:
#   * * * * * /pfad/zu/geratehaus-app/scripts/updater.sh >> /var/log/geratehaus-updater.log 2>&1
# Alternativ als systemd .path + .service Unit, die auf die Markerdatei triggert.
#
# Voraussetzungen: git, docker (compose) und Schreibrechte im Repo-Verzeichnis
# für den ausführenden User.

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MARKER="$REPO_DIR/update-signal/update-requested"

cd "$REPO_DIR"

# Nur aktiv werden, wenn eine Update-Anforderung vorliegt.
[ -f "$MARKER" ] || exit 0

ANGEFORDERTE_VERSION="$(head -n 1 "$MARKER" 2>/dev/null || echo '?')"
echo "[updater $(date -Is)] Update angefordert (Zielversion: ${ANGEFORDERTE_VERSION}) – starte."

# Marker zuerst entfernen, damit ein erneuter Klick sauber neu triggern kann und
# ein fehlgeschlagener Lauf nicht in einer Endlosschleife hängen bleibt.
rm -f "$MARKER"

git pull --ff-only
docker compose up -d --build

echo "[updater $(date -Is)] Update abgeschlossen."
