from pydantic import BaseModel, ConfigDict, Field


class KioskTokenOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    bezeichnung: str
    token: str


class KioskTokenAnlegen(BaseModel):
    bezeichnung: str = Field(min_length=1, max_length=255)


class KioskTokenValidierung(BaseModel):
    gueltig: bool
