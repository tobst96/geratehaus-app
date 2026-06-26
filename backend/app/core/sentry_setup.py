"""Initialisiert Sentry für zentrales Fehler-Monitoring über ALLE
Installationen von Gerätehaus.app hinweg (eigene und fremde) – nicht nur
diese eine Instanz.

PROJECT_DSN ist daher bewusst eine feste Konstante im Code, nicht eine pro
Instanz konfigurierbare .env-Variable: jede Installation, die diesem Repo
folgt, soll Fehlerberichte an dasselbe (das Entwickler-)Sentry-Projekt
schicken können, sofern die jeweilige Instanz zustimmt. Eine Sentry-DSN ist
laut Sentry selbst kein Geheimnis – sie erlaubt nur das *Senden* von Events,
kein Lesen/Verwalten des Projekts –, daher ist es unproblematisch, sie ins
öffentliche Repo zu committen. Dieses Muster (feste DSN im Code, Zustimmung
pro Installation) nutzen viele Open-Source-Projekte für anonyme
Crash-Reports (z. B. VS Code, Homebrew).

Initialisiert wird nur, wenn die jeweilige Instanz über den Setup-Wizard
oder die Moderator-Einstellungen zugestimmt hat (app_config
"fehlerberichte_aktiv", Default aus). Wirkt erst nach einem Neustart des
Backend-Containers, da sentry_sdk.init() globale Hooks installiert und
nicht für dynamisches Umschalten zur Laufzeit gedacht ist.

Für lokale Entwicklung/Tests oder einen bewussten Opt-out auf Code-Ebene
kann die Konstante über SENTRY_DSN in der .env überschrieben werden (leerer
String schaltet Sentry zuverlässig aus, unabhängig vom Zustimmungs-Toggle)."""

import sentry_sdk
import structlog

from app.core.config import settings

logger = structlog.get_logger(__name__)

PROJECT_DSN = (
    "https://68e023a6b238e5694ba132671c87d31f@o4511632673669120.ingest.de.sentry.io/4511632679436368"
)


def _aktive_dsn() -> str:
    return settings.sentry_dsn if settings.sentry_dsn is not None else PROJECT_DSN


def init_sentry_wenn_aktiviert(fehlerberichte_aktiv: bool) -> bool:
    """Gibt zurück, ob Sentry tatsächlich initialisiert wurde."""
    dsn = _aktive_dsn()
    if not dsn or not fehlerberichte_aktiv:
        return False

    sentry_sdk.init(
        dsn=dsn,
        environment=settings.environment,
        # Keine personenbezogenen Daten (IP, Cookies, Request-Body) mitsenden –
        # nur technische Fehlerdetails (Stacktrace, Request-Pfad/-Methode).
        send_default_pii=False,
        traces_sample_rate=0.0,
    )
    logger.info("sentry_aktiviert", environment=settings.environment)
    return True
