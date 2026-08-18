from datetime import date

from pydantic import BaseModel, Field


class DienststundenErfassen(BaseModel):
    funktion_id: int
    stunden: float = Field(gt=0)
    datum: date
    ohne_pin: bool = False


class DienststundenEintragOut(BaseModel):
    id: int
    person_id: int
    person_name: str
    funktion_id: int
    funktion_name: str
    stunden: float
    datum: date
    ohne_pin: bool


class DienststundenStempelInfo(BaseModel):
    """Öffentlicher Kontext für das Dienststunden-Stempel-Poster (QR-Ziel)."""

    funktion_id: int
    funktion_name: str
    aktiv: bool


class DienststundenSummeOut(BaseModel):
    funktion_id: int
    funktion_name: str
    summe_stunden: float
    schwellenwert_stunden: float
    schwellenwert_ueberschritten: bool


class SchwellenwertEintragOut(BaseModel):
    person_id: int
    person_name: str
    funktion_id: int
    funktion_name: str
    summe_stunden: float
    schwellenwert_stunden: float
    uebernommen_stunden: float
    ueberschuss_stunden: float


class UebernahmeAnlegen(BaseModel):
    person_id: int
    funktion_id: int
    stunden: float = Field(gt=0)
