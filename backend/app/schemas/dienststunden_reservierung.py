from datetime import date, datetime

from pydantic import BaseModel, Field


class DienststundenReservierungOut(BaseModel):
    token: str
    ablauf_am: datetime


class DienststundenReservierungInfo(BaseModel):
    abgelaufen: bool
    bereits_eingeloest: bool
    vorschau_person_name: str | None = None
    vorschau_bild_url: str | None = None


class DienststundenReservierungVorschauSetzen(BaseModel):
    person_id: int


class DienststundenReservierungEinloesen(BaseModel):
    person_id: int
    funktion_id: int
    stunden: float = Field(gt=0)
    datum: date
