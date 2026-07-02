"""Prüft auf neue Releases von Gerätehaus.app auf GitHub und kann ein Update
anstoßen. Der Backend-Container hat bewusst keinen Zugriff auf Docker/Git des
Hosts – „Update anstoßen" schreibt daher nur eine Markerdatei in einen per
Bind-Mount geteilten Ordner (settings.update_signal_dir). Ein host-seitiges
Skript (scripts/updater.sh, per cron/systemd) beobachtet den Ordner und führt
das eigentliche Update aus (git pull + docker compose up -d --build)."""

import re
import time
from datetime import datetime, timezone
from importlib.metadata import PackageNotFoundError, version
from pathlib import Path

import httpx
import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.services.config_service import config_service

logger = structlog.get_logger(__name__)

GITHUB_REPO = "tobst96/geratehaus-app"
GITHUB_API_URL = f"https://api.github.com/repos/{GITHUB_REPO}/releases"
CACHE_TTL_SEKUNDEN = 300

# Name der Markerdatei im geteilten Signal-Ordner; das Host-Skript entfernt sie
# nach dem Update wieder.
UPDATE_MARKER_NAME = "update-requested"

_cache: dict[str, tuple[float, list[dict]]] = {}


def installierte_version() -> str:
    try:
        return version("geratehaus-app")
    except PackageNotFoundError:
        return "unbekannt"


async def _releases_laden() -> list[dict]:
    jetzt = time.monotonic()
    eintrag = _cache.get("releases")
    if eintrag is not None and jetzt - eintrag[0] < CACHE_TTL_SEKUNDEN:
        return eintrag[1]

    async with httpx.AsyncClient(timeout=5.0) as client:
        response = await client.get(GITHUB_API_URL, headers={"Accept": "application/vnd.github+json"})
        response.raise_for_status()
        releases = response.json()

    _cache["releases"] = (jetzt, releases)
    return releases


def _zu_pep440(v: str) -> str:
    """Wandelt gängige Semver-Pre-Release-Suffixe in PEP-440 um (0.3.0-beta.2 → 0.3.0b2)."""
    v = re.sub(r"-alpha\.?(\d*)", lambda m: f"a{m.group(1)}", v)
    v = re.sub(r"-beta\.?(\d*)", lambda m: f"b{m.group(1)}", v)
    v = re.sub(r"-rc\.?(\d*)", lambda m: f"rc{m.group(1)}", v)
    return v


def _passende_release(releases: list[dict], kanal: str) -> dict | None:
    for release in releases:
        if release.get("draft"):
            continue
        if kanal == "stable" and release.get("prerelease"):
            continue
        return release
    return None


async def update_status(db: AsyncSession) -> dict:
    kanal = await config_service.get(db, "update_kanal", "stable")
    aktuelle_version = installierte_version()

    try:
        releases = await _releases_laden()
    except (httpx.HTTPError, ValueError) as exc:
        logger.warning("update_check_fehlgeschlagen", exc_info=True)
        return {
            "kanal": kanal,
            "installierte_version": aktuelle_version,
            "verfuegbare_version": None,
            "veroeffentlicht_am": None,
            "release_url": None,
            "update_verfuegbar": False,
            "fehler": f"GitHub-Releases konnten nicht abgerufen werden: {exc}",
        }

    release = _passende_release(releases, kanal)
    if release is None:
        return {
            "kanal": kanal,
            "installierte_version": aktuelle_version,
            "verfuegbare_version": None,
            "veroeffentlicht_am": None,
            "release_url": None,
            "update_verfuegbar": False,
            "fehler": None,
        }

    verfuegbare_version = str(release.get("tag_name", "")).lstrip("v")
    return {
        "kanal": kanal,
        "installierte_version": aktuelle_version,
        "verfuegbare_version": verfuegbare_version,
        "veroeffentlicht_am": release.get("published_at"),
        "release_url": release.get("html_url"),
        "update_verfuegbar": bool(verfuegbare_version) and _zu_pep440(verfuegbare_version) != _zu_pep440(aktuelle_version),
        "fehler": None,
    }


async def kanal_setzen(db: AsyncSession, kanal: str) -> None:
    await config_service.set(db, "update_kanal", kanal)


async def update_ausloesen(db: AsyncSession) -> dict:
    """Stößt ein Update an, sofern eine neue Version verfügbar ist: schreibt eine
    Markerdatei in den geteilten Signal-Ordner. Das eigentliche Update übernimmt
    das host-seitige Skript (scripts/updater.sh). Gibt {angefordert, verfuegbare_version,
    meldung} zurück; `angefordert=False` bei bereits aktueller Version oder Fehler."""
    status = await update_status(db)
    verfuegbare_version = status["verfuegbare_version"]

    if status["fehler"]:
        return {"angefordert": False, "verfuegbare_version": verfuegbare_version, "meldung": status["fehler"]}
    if not status["update_verfuegbar"]:
        return {
            "angefordert": False,
            "verfuegbare_version": verfuegbare_version,
            "meldung": "Es ist bereits die neueste Version installiert.",
        }

    marker = Path(settings.update_signal_dir) / UPDATE_MARKER_NAME
    try:
        marker.parent.mkdir(parents=True, exist_ok=True)
        marker.write_text(
            f"{verfuegbare_version}\n{datetime.now(timezone.utc).isoformat()}\n", encoding="utf-8"
        )
    except OSError as exc:
        logger.warning("update_marker_schreiben_fehlgeschlagen", exc_info=True)
        return {
            "angefordert": False,
            "verfuegbare_version": verfuegbare_version,
            "meldung": f"Update-Anforderung konnte nicht geschrieben werden: {exc}",
        }

    logger.info("update_angefordert", verfuegbare_version=verfuegbare_version)
    return {
        "angefordert": True,
        "verfuegbare_version": verfuegbare_version,
        "meldung": "Update angefordert. Der Server aktualisiert sich in Kürze und startet dabei neu.",
    }
