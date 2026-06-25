from datetime import datetime

from pydantic import BaseModel


class PersonBildReservierungOut(BaseModel):
    token: str
    ablauf_am: datetime


class PersonBildReservierungInfo(BaseModel):
    abgelaufen: bool
    bereits_eingeloest: bool
    person_name: str
    person_bild_url: str | None = None
