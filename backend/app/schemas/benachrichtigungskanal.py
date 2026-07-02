from pydantic import BaseModel, ConfigDict


class KanalTypOut(BaseModel):
    key: str
    label: str
    zielwert_label: str


class KanalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    typ: str
    zielwert: str
    aktiv: bool


class KanalSetzen(BaseModel):
    zielwert: str = ""
    aktiv: bool = True
