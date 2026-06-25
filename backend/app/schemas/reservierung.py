from datetime import datetime

from pydantic import BaseModel, Field


class ReservierungAnlegen(BaseModel):
    fahrzeug_id: int | None = None
    sitzplatz_id: str | None = None
    bezeichnung: str = Field(min_length=1, max_length=255)
    nur_geraetehaus: bool = False
    auf_anfahrt: bool = False


class ReservierungOut(BaseModel):
    token: str
    ablauf_am: datetime


class ReservierungInfo(BaseModel):
    bezeichnung: str
    einsatz_titel: str
    fahrzeug_name: str | None
    abgelaufen: bool
    bereits_eingeloest: bool
    nur_geraetehaus: bool
    auf_anfahrt: bool
    vorschau_person_name: str | None = None
    vorschau_bild_url: str | None = None


class ReservierungEinloesen(BaseModel):
    person_id: int
    vab: bool = False
    atemschutzminuten: int = Field(default=0, ge=0)
    bemerkung: str | None = None


class ReservierungVorschauSetzen(BaseModel):
    person_id: int
