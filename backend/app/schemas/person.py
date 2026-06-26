from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class PersonOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    vorname: str | None
    zwischenname: str | None
    nachname: str | None
    bild_url: str | None
    email: str | None
    gruppe_id: int | None
    funktion_id: int | None
    gesamtpunkte: int
    pin_gesetzt: bool


class PersonCreate(BaseModel):
    vorname: str = Field(min_length=1, max_length=128)
    zwischenname: str | None = Field(default=None, max_length=128)
    nachname: str = Field(min_length=1, max_length=128)
    email: str | None = Field(default=None, max_length=255)
    gruppe_id: int | None = None
    funktion_id: int | None = None


class PersonUpdate(BaseModel):
    vorname: str | None = Field(default=None, min_length=1, max_length=128)
    zwischenname: str | None = Field(default=None, max_length=128)
    nachname: str | None = Field(default=None, min_length=1, max_length=128)
    email: str | None = Field(default=None, max_length=255)
    gruppe_id: int | None = None
    funktion_id: int | None = None


class PersonEreignisOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    zeitpunkt: datetime
    typ: str
    beschreibung: str


class PersonPinSetzen(BaseModel):
    pin: str = Field(min_length=4, max_length=6, pattern=r"^\d+$")


class PersonPunktOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    punkte: float
    grund: str
    gueltig_bis: date
    erstellt_am: datetime
