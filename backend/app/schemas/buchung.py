from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator


class BuchungAnfrage(BaseModel):
    fahrzeug_id: int
    von: datetime
    bis: datetime
    zweck: str = Field(min_length=1)

    @model_validator(mode="after")
    def _validiere_zeitraum(self) -> "BuchungAnfrage":
        if self.bis <= self.von:
            raise ValueError("Das Ende der Buchung muss nach dem Beginn liegen.")
        return self


class BuchungOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    fahrzeug_id: int
    fahrzeug_name: str
    von: datetime
    bis: datetime
    zweck: str
    verantwortliche_person_id: int
    verantwortliche_person_name: str
    status: str
    ablehnungsgrund: str | None
    hat_konflikt: bool


class BuchungAnfrageErgebnis(BaseModel):
    buchung: BuchungOut
    konflikt_hinweis: bool


class BuchungAblehnen(BaseModel):
    grund: str | None = None
