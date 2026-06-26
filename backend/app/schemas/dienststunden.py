from datetime import date

from pydantic import BaseModel, ConfigDict, Field


class DienststundenErfassen(BaseModel):
    funktion_id: int
    stunden: float = Field(gt=0)
    datum: date


class DienststundenEintragOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    person_id: int
    funktion_id: int
    stunden: float
    datum: date


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
