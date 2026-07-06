from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ModeratorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    rolle: str
    email: str | None = None


class ModeratorAnlegen(BaseModel):
    username: str = Field(min_length=1, max_length=255)
    passwort: str = Field(min_length=8)
    rolle: Literal["admin", "gruppenfuehrer"] = "gruppenfuehrer"
    email: str | None = Field(default=None, max_length=255)


class ModeratorAktualisieren(BaseModel):
    # Leerer String → E-Mail entfernen; None → unverändert lassen.
    email: str | None = Field(default=None, max_length=255)


class ModeratorPasswortAendern(BaseModel):
    passwort: str = Field(min_length=8)
