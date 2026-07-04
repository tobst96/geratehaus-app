import re

from fastapi import APIRouter
from pydantic import BaseModel

from app.api.deps import CurrentModerator
from app.services import update_service

router = APIRouter(prefix="/moderator/meta", tags=["moderator:meta"])


class MetaOut(BaseModel):
    installierte_version: str
    # Basis-URL der Modul-Docs auf GitHub, passend zum installierten Release
    # (Tag v<version>; Fallback 'main' bei unbekannter/ungetaggter Version).
    docs_basis_url: str


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
