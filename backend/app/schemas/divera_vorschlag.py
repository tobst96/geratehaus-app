from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict


class DiveraVorschlagOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    divera_user_id: str
    art: Literal["neu", "email_update"]
    vorschlag_daten: dict[str, Any]
    bestehende_person_id: int | None
    status: Literal["offen", "uebernommen", "ignoriert"]
    erstellt_am: datetime


class DiveraVorschlagEntscheidung(BaseModel):
    aktion: Literal["uebernehmen", "ignorieren"]
