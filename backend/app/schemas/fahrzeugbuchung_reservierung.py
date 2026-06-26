from datetime import datetime

from pydantic import BaseModel, Field, model_validator


class FahrzeugbuchungReservierungOut(BaseModel):
    token: str
    ablauf_am: datetime


class FahrzeugbuchungReservierungInfo(BaseModel):
    abgelaufen: bool
    bereits_eingeloest: bool
    vorschau_person_name: str | None = None
    vorschau_bild_url: str | None = None


class FahrzeugbuchungReservierungVorschauSetzen(BaseModel):
    person_id: int
    pin: str | None = None


class FahrzeugbuchungReservierungEinloesen(BaseModel):
    person_id: int
    fahrzeug_id: int
    von: datetime
    bis: datetime
    zweck: str = Field(min_length=1)

    @model_validator(mode="after")
    def _validiere_zeitraum(self) -> "FahrzeugbuchungReservierungEinloesen":
        if self.bis <= self.von:
            raise ValueError("Das Ende der Buchung muss nach dem Beginn liegen.")
        return self
