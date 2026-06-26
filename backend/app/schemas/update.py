from pydantic import BaseModel, Field


class UpdateStatusOut(BaseModel):
    kanal: str
    installierte_version: str
    verfuegbare_version: str | None
    veroeffentlicht_am: str | None
    release_url: str | None
    update_verfuegbar: bool
    fehler: str | None = None


class UpdateKanalSetzen(BaseModel):
    kanal: str = Field(pattern="^(stable|beta)$")
