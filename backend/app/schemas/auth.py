from pydantic import BaseModel, Field


class NameEintragen(BaseModel):
    name: str = Field(min_length=1, max_length=255)


class PinEinrichten(BaseModel):
    lat: float
    lon: float
    pin: str


class PinVerifizieren(BaseModel):
    pin: str


class ModeratorToken(BaseModel):
    access_token: str
    token_type: str = "bearer"
