from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ElevatedPersonOut(BaseModel):
    """Person mit erhöhtem Zugang (Admin/Gruppenführer) – für die Verwaltung.
    Passwort-Hash/2FA-Secrets werden nie ausgegeben, nur Status-Flags."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    gruppenfuehrer_rolle: str | None = None
    email: str | None = None
    benachrichtigungen_aktiv: bool = False
    zwei_faktor_aktiv: bool = False


class PersonElevieren(BaseModel):
    """Person auf Admin/Gruppenführer heben (oder Rolle ändern). `passwort` ist
    optional, wenn die Person schon eins hat – sonst Pflicht (Prüfung im Router)."""

    rolle: Literal["admin", "gruppenfuehrer"]
    passwort: str | None = Field(default=None, min_length=8)


class PersonPasswortSetzen(BaseModel):
    passwort: str = Field(min_length=8)


class ZweiFaktorStatus(BaseModel):
    aktiv: bool
    email_gesetzt: bool


class RecoveryCodesOut(BaseModel):
    codes: list[str]
