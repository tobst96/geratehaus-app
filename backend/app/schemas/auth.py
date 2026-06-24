from pydantic import BaseModel, Field


class NameEintragen(BaseModel):
    name: str = Field(min_length=1, max_length=255)


class BarcodeEinscannen(BaseModel):
    token: str = Field(min_length=1, max_length=64)


class BarcodeIdentitaet(BaseModel):
    name: str


class ModeratorToken(BaseModel):
    access_token: str
    token_type: str = "bearer"
