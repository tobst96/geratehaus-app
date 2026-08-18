from pydantic import BaseModel, Field


class SetupStatus(BaseModel):
    ist_eingerichtet: bool


class SetupFahrzeug(BaseModel):
    name: str = Field(min_length=1, max_length=255)


class SetupNotifier(BaseModel):
    """Optionale Basis-Benachrichtigungskonfiguration im Wizard. Felder werden
    nur übernommen, wenn der jeweilige Kanal aktiviert ist (siehe
    setup_service.setup_durchfuehren)."""

    email_aktiv: bool = False
    email_smtp_host: str = ""
    email_smtp_port: int = 587
    email_smtp_user: str = ""
    email_smtp_password: str = ""
    email_smtp_use_tls: bool = True
    email_from: str = ""
    email_recipients: str = ""
    push_aktiv: bool = False


class SetupBasis(BaseModel):
    """Gemeinsame Felder für Erst-Einrichtung UND „erneut ausführen" – Branding/
    Module/Benachrichtigungen. Die Admin-Person wird bewusst NICHT hier
    verwaltet (siehe SetupRequest) – das passiert ausschließlich einmalig beim
    First-Run; danach läuft Zugangsverwaltung (Passwort ändern etc.)
    ausschließlich über „Erhöhter Zugang" in Personal (ein einziger Ort)."""

    organisation_name: str = Field(min_length=1, max_length=255)
    farbe_primaer: str = Field(default="#FFA633", pattern=r"^#[0-9A-Fa-f]{6}$")
    farbe_akzent: str = Field(default="#1A1A1A", pattern=r"^#[0-9A-Fa-f]{6}$")
    fehlerberichte_aktiv: bool = False
    # Alle drei folgenden Felder sind bewusst optional mit neutralem Default –
    # der Wizard bleibt schlank, diese Zusatzschritte sind überspringbar
    # (siehe test_setup_mit_frontend_payload_erfolgreich, das ohne sie testet).
    fahrzeuge: list[SetupFahrzeug] = []
    module_aktiv: dict[str, bool] = {}
    notifier: SetupNotifier | None = None


class SetupRequest(SetupBasis):
    """Nur für den First-Run (POST /setup): legt zusätzlich die erste Person als
    Admin an – mit echtem Namen statt eines anonymen Platzhalter-Accounts, damit
    später in Personal keine zweite, „doppelte" Person für dieselbe E-Mail
    nötig ist. E-Mail ist Pflicht, da Login (Gruppenführer- wie Mitgliederbereich)
    über E-Mail statt Name läuft."""

    admin_vorname: str = Field(min_length=1, max_length=128)
    admin_nachname: str = Field(min_length=1, max_length=128)
    admin_email: str = Field(min_length=1, max_length=255)
    admin_passwort: str = Field(min_length=8)
