from datetime import datetime

from pydantic import BaseModel


class DienstbuchReservierungOut(BaseModel):
    token: str
    ablauf_am: datetime


class DienstbuchReservierungInfo(BaseModel):
    dienstbuch_titel: str
    abgelaufen: bool
    bereits_eingeloest: bool
    vorschau_person_name: str | None = None
    vorschau_bild_url: str | None = None


class DienstbuchReservierungVorschauSetzen(BaseModel):
    person_id: int
    pin: str | None = None


class DienstbuchReservierungEinloesen(BaseModel):
    person_id: int
    gruppe_id: int | None = None
