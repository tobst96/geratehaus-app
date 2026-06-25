from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class DienstbuchAnlegen(BaseModel):
    titel: str = Field(min_length=1, max_length=255)
    eroeffnet_am: datetime
    notizen: str | None = None


class TeilnehmerAnlegen(BaseModel):
    gruppe_id: int | None = None
    atemschutzminuten: int = Field(default=0, ge=0)


class TeilnehmerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    person_id: int
    person_name: str
    gruppe_id: int | None
    gruppe_name: str | None
    atemschutzminuten: int


class DienstbuchOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    titel: str
    eroeffnet_am: datetime
    notizen: str | None
    archiviert: bool
    teilnehmer: list[TeilnehmerOut] = []
