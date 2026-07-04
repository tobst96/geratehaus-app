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


@router.get("", response_model=MetaOut)
async def meta(_mod: CurrentModerator) -> MetaOut:
    version = update_service.installierte_version()
    tag = f"v{version}" if version and version != "unbekannt" else "main"
    return MetaOut(
        installierte_version=version,
        docs_basis_url=f"https://github.com/{update_service.GITHUB_REPO}/blob/{tag}/docs",
    )
