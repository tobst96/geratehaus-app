from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class EinsatzAnlegen(BaseModel):
    titel: str = Field(min_length=1, max_length=255)
    zeitpunkt: datetime


class TeilnahmeAnlegen(BaseModel):
    fahrzeug_id: int | None = None
    sitzplatz_id: str | None = None
    funktion_id: int | None = None
    vab: bool = False
    atemschutzminuten: int = Field(default=0, ge=0)
    nur_geraetehaus: bool = False


class TeilnahmeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    person_id: int
    person_name: str
    fahrzeug_id: int | None
    fahrzeug_name: str | None
    sitzplatz_id: str | None
    funktion_id: int | None
    funktion_name: str | None
    vab: bool
    atemschutzminuten: int
    nur_geraetehaus: bool


class EinsatzOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    titel: str
    quelle: str
    divera_id: str | None
    zeitpunkt: datetime
    status: str
    archiviert: bool
    teilnahmen: list[TeilnahmeOut] = []
