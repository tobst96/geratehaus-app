"""Prüft auf neue Releases von Gerätehaus.app auf GitHub – zeigt nur an,
löst kein automatisches Update aus. Der Backend-Container hat bewusst
keinen Zugriff auf Docker/Git des Hosts, ein tatsächliches Update bleibt
Sache des Admins (z. B. per SSH: git pull + docker compose up --build)."""

import re
import time
from importlib.metadata import PackageNotFoundError, version

import httpx
import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.config_service import config_service

logger = structlog.get_logger(__name__)

GITHUB_REPO = "tobst96/geratehaus-app"
GITHUB_API_URL = f"https://api.github.com/repos/{GITHUB_REPO}/releases"
CACHE_TTL_SEKUNDEN = 300

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
