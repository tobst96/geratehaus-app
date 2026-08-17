from datetime import datetime

from pydantic import BaseModel

from app.schemas.dienststunden import DienststundenSummeOut


class MeinEinsatzKurz(BaseModel):
    id: int
    titel: str
    zeitpunkt: datetime


class MitgliedUebersicht(BaseModel):
    """Aggregierte eigene Kennzahlen für das persönliche Mitglieder-Dashboard."""

    einsaetze_jahr: int
    dienste_jahr: int
    dienststunden: list[DienststundenSummeOut]
    letzte_einsaetze: list[MeinEinsatzKurz]
