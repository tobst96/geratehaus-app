from pydantic import BaseModel, Field


class NameEintragen(BaseModel):
    name: str = Field(min_length=1, max_length=255)


class BarcodeEinscannen(BaseModel):
    token: str = Field(min_length=1, max_length=64)


class BarcodeIdentitaet(BaseModel):
    name: str


class BarcodeVorschau(BaseModel):
    name: str
    bild_url: str | None
    gruppe_id: int | None
    funktion_id: int | None


class PersonAuswahl(BaseModel):
    """Für die Namensauswahl am Kiosk, wenn das Barcode-Modul AUS ist."""

    id: int
    name: str
    bild_url: str | None
    pin_gesetzt: bool


class NamePinLogin(BaseModel):
    person_id: int
    pin: str | None = Field(default=None, max_length=64)


class PinAnfordern(BaseModel):
    person_id: int


class PinSetzen(BaseModel):
    pin: str = Field(min_length=4, max_length=64)


class PinTokenInfo(BaseModel):
    name: str
    gueltig: bool


class FreigabeTokenInfo(BaseModel):
    name: str
    offen: bool
    email: str | None


class FreigabeEinloesen(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    pin: str | None = Field(default=None, min_length=4, max_length=64)


class ModeratorToken(BaseModel):
    access_token: str
    token_type: str = "bearer"


class MeinProfil(BaseModel):
    gruppe_id: int | None
    funktion_id: int | None
