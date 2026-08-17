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
    funktion_id: int | None
    gruppe_id: int | None


class NamePinLogin(BaseModel):
    person_id: int
    pin: str | None = Field(default=None, max_length=64)


class NamePinVorschau(BaseModel):
    """Bildvorschau nach korrektem PIN – ohne Login/Cookie."""

    name: str
    bild_url: str | None


class PinAnfordern(BaseModel):
    person_id: int


class PinSetzen(BaseModel):
    pin: str = Field(min_length=4, max_length=64)


class PinTokenInfo(BaseModel):
    name: str
    gueltig: bool


class MitgliedPasswortLogin(BaseModel):
    name: str
    passwort: str


class PasswortAnfordern(BaseModel):
    name: str


class PasswortSetzen(BaseModel):
    passwort: str = Field(min_length=8, max_length=128)


class FreigabeTokenInfo(BaseModel):
    name: str
    offen: bool
    email: str | None


class FreigabeEinloesen(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    pin: str | None = Field(default=None, min_length=4, max_length=64)


class GruppenfuehrerToken(BaseModel):
    access_token: str
    token_type: str = "bearer"


class GruppenfuehrerLoginErgebnis(BaseModel):
    """Login-Ergebnis: entweder direkt ein Token, oder – bei aktivem 2FA auf einem
    unbekannten Gerät – die Aufforderung, den per E-Mail gesendeten Code einzugeben
    (mit kurzlebigem `challenge`-Token für den zweiten Schritt)."""

    access_token: str | None = None
    token_type: str = "bearer"
    zwei_faktor_erforderlich: bool = False
    # Pflicht-2FA: der Zugang hat noch kein aktives 2FA und muss es jetzt erzwungen
    # einrichten (E-Mail hinterlegen + Recovery-Codes sichern), bevor ein Token folgt.
    einrichtung_erforderlich: bool = False
    email_gesetzt: bool = False
    challenge: str | None = None


class Gruppenfuehrer2FA(BaseModel):
    challenge: str
    code: str
    angemeldet_bleiben: bool = False


class Gruppenfuehrer2FAEinrichten(BaseModel):
    """Erzwungene 2FA-Einrichtung im Login-Fluss: authentisiert über den
    `challenge` aus dem Passwortschritt. `email` nur nötig, wenn am Konto noch
    keine hinterlegt ist."""

    challenge: str
    email: str | None = None


class Gruppenfuehrer2FAEinrichtenErgebnis(BaseModel):
    recovery_codes: list[str]
    challenge: str


class MeinProfil(BaseModel):
    name: str
    bild_url: str | None
    gruppe_id: int | None
    funktion_id: int | None
    email: str | None = None
    benachrichtigungen_aktiv: bool = False
    passwort_gesetzt: bool = False
    # None = normales Mitglied ohne erhöhten Zugang; sonst "gruppenfuehrer"/"admin".
    # Steuert im Frontend, ob der Wechsel in den Gruppenführer-/Admin-Bereich
    # angeboten wird (siehe /auth/gruppenfuehrer/step-up).
    gruppenfuehrer_rolle: str | None = None


class MeinPasswort(BaseModel):
    passwort: str = Field(min_length=8, max_length=128)


class MeinProfilUpdate(BaseModel):
    email: str | None = None
    benachrichtigungen_aktiv: bool | None = None
