from pydantic import BaseModel, ConfigDict


class ModulOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    key: str
    name: str
    beschreibung: str
    aktiv: bool


class ModulAktivSetzen(BaseModel):
    aktiv: bool
