"""Initialisiert Sentry nur, wenn BEIDE Bedingungen zutreffen: ein DSN ist
in der .env gesetzt (Betreiber-Entscheidung, an welches Sentry-Projekt
gesendet wird) UND die Instanz hat dem über den Setup-Wizard oder die
Moderator-Einstellungen zugestimmt (app_config "fehlerberichte_aktiv",
Default aus). Ohne DSN wird nie etwas gesendet, unabhängig von der
Zustimmung. Wirkt erst nach einem Neustart des Backend-Containers, da
sentry_sdk.init() globale Hooks installiert und nicht für dynamisches
Umschalten zur Laufzeit gedacht ist."""

import sentry_sdk
import structlog

from app.core.config import settings

logger = structlog.get_logger(__name__)


def init_sentry_wenn_aktiviert(fehlerberichte_aktiv: bool) -> bool:
    """Gibt zurück, ob Sentry tatsächlich initialisiert wurde."""
    if not settings.sentry_dsn or not fehlerberichte_aktiv:
        return False

    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        environment=settings.environment,
        # Keine personenbezogenen Daten (IP, Cookies, Request-Body) mitsenden –
        # nur technische Fehlerdetails (Stacktrace, Request-Pfad/-Methode).
        send_default_pii=False,
        traces_sample_rate=0.0,
    )
    logger.info("sentry_aktiviert", environment=settings.environment)
    return True
