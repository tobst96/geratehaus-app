from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ModeratorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    rolle: str
    email: str | None = None
    benachrichtigungen_aktiv: bool = False


class ModeratorAnlegen(BaseModel):
    username: str = Field(min_length=1, max_length=255)
    passwort: str = Field(min_length=8)
    rolle: Literal["admin", "gruppenfuehrer"] = "gruppenfuehrer"
    email: str | None = Field(default=None, max_length=255)
    benachrichtigungen_aktiv: bool = False


class ModeratorAktualisieren(BaseModel):
    # Nur mitgesendete Felder werden geändert (siehe model_fields_set im Endpunkt):
    # email leerer String → entfernen; weggelassen → unverändert.
    email: str | None = Field(default=None, max_length=255)
    benachrichtigungen_aktiv: bool | None = None


class ModeratorPasswortAendern(BaseModel):
    passwort: str = Field(min_length=8)


class ZweiFaktorStatus(BaseModel):
    aktiv: bool
    email_gesetzt: bool


class RecoveryCodesOut(BaseModel):
    codes: list[str]
