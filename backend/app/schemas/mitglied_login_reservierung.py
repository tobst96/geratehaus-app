from datetime import datetime

from pydantic import BaseModel


class MitgliedLoginReservierungOut(BaseModel):
    token: str
    ablauf_am: datetime


class MitgliedLoginReservierungInfo(BaseModel):
    abgelaufen: bool
    bestaetigt: bool
    eingeloest: bool
    person_name: str | None = None
    person_bild_url: str | None = None


class MitgliedLoginAnmelden(BaseModel):
    person_id: int
    pin: str | None = None
