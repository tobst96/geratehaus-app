import re
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel

from app.api.deps import CurrentAdmin, CurrentModerator, DbSession
from app.services import berechtigungs_service, systemstatus_service, update_service

router = APIRouter(prefix="/gruppenfuehrer/meta", tags=["moderator:meta"])


class MetaOut(BaseModel):
    installierte_version: str
    # Basis-URL der Modul-Docs auf GitHub, passend zum installierten Release
    # (Tag v<version>; Fallback 'main' bei unbekannter/ungetaggter Version).
    docs_basis_url: str


class MeineBerechtigungenOut(BaseModel):
    ist_admin: bool
    # Modul-Keys, auf die der angemeldete Moderator zugreifen darf (Admins: alle).
    keys: list[str]


class SystemStatusOut(BaseModel):
    """Read-only Betriebsstatus fürs Admin-Observability-Panel."""

    version: str
    datenbank: dict[str, Any]
    smtp: dict[str, Any]
    minio: dict[str, Any]
    divera: dict[str, Any]
    scheduler: dict[str, Any]


def _version_zu_tag(version: str) -> str:
    """Wandelt die (PEP-440-normalisierte) Version in den Git-Tag um, wie er im Repo
    vergeben wird: '0.4.0b1' -> 'v0.4.0-beta.1'. Fallback 'main'."""
    if not version or version == "unbekannt":
        return "main"
    m = re.match(r"^(\d+\.\d+\.\d+)(?:(a|b|rc)(\d+))?$", version)
    if not m:
        return "main"
    base, pre, num = m.groups()
    if not pre:
        return f"v{base}"
    label = {"a": "alpha", "b": "beta", "rc": "rc"}[pre]
    return f"v{base}-{label}.{num}"


@router.get("", response_model=MetaOut)
async def meta(_mod: CurrentModerator) -> MetaOut:
    version = update_service.installierte_version()
    tag = _version_zu_tag(version)
    return MetaOut(
        installierte_version=version,
        docs_basis_url=f"https://github.com/{update_service.GITHUB_REPO}/blob/{tag}/docs",
    )


@router.get("/meine-berechtigungen", response_model=MeineBerechtigungenOut)
async def meine_berechtigungen(db: DbSession, moderator: CurrentModerator) -> MeineBerechtigungenOut:
    """Eigene Modul-Zugriffe des angemeldeten Moderators – die Grundlage für die
    Frontend-Navigation/Routen-Guards (`hat_zugriff` statt Rolle). Bewusst NICHT
    modul-gegated, da jeder Moderator seine eigenen Rechte kennen muss."""
    return MeineBerechtigungenOut(
        ist_admin=berechtigungs_service.ist_admin(moderator),
        keys=await berechtigungs_service.meine_keys(db, moderator),
    )


@router.get("/systemstatus", response_model=SystemStatusOut)
async def systemstatus(db: DbSession, _admin: CurrentAdmin) -> SystemStatusOut:
    """Betriebsstatus (DB/SMTP/MinIO/Divera + geplante Jobs) fürs Admin-Panel.
    Admin-only – reine Support-/Observability-Info."""
    return SystemStatusOut(**await systemstatus_service.system_status(db))
