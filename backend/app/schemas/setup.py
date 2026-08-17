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


class SetupRequest(BaseModel):
    organisation_name: str = Field(min_length=1, max_length=255)
    farbe_primaer: str = Field(default="#FFA633", pattern=r"^#[0-9A-Fa-f]{6}$")
    farbe_akzent: str = Field(default="#1A1A1A", pattern=r"^#[0-9A-Fa-f]{6}$")
    admin_passwort: str = Field(min_length=8)
    fehlerberichte_aktiv: bool = False
    # Alle drei folgenden Felder sind bewusst optional mit neutralem Default –
    # der Wizard bleibt schlank, diese Zusatzschritte sind überspringbar
    # (siehe test_setup_mit_frontend_payload_erfolgreich, das ohne sie testet).
    fahrzeuge: list[SetupFahrzeug] = []
    module_aktiv: dict[str, bool] = {}
    notifier: SetupNotifier | None = None
