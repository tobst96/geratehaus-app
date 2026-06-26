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
String schaltet Sentry zuverlässig aus, unabhängig vom Zustimmungs-Toggle).

Sentry-Events werden als "beta" oder "production" getaggt (Feld
`environment`), abhängig von der tatsächlich installierten Versionsnummer
(`importlib.metadata.version`, siehe `_sentry_umgebung`) – nicht vom in den
Einstellungen gewählten Update-Kanal, der nur anzeigt, ob ein Update
verfügbar ist, aber nichts über die tatsächlich laufende Version aussagt.
Die genaue Versionsnummer geht zusätzlich als `release` mit, für
Versions-genaue Auswertung in Sentry."""

import logging

import sentry_sdk
import structlog
from sentry_sdk.integrations.logging import LoggingIntegration

from app.core.config import settings
from app.services.update_service import installierte_version

logger = structlog.get_logger(__name__)

PROJECT_DSN = (
    "https://68e023a6b238e5694ba132671c87d31f@o4511632673669120.ingest.de.sentry.io/4511632679436368"
)

# Marker, an denen eine Vorab-/Beta-Version in der installierten Versions-
# nummer erkannt wird (PEP 440 / SemVer-Konvention, z. B. "0.3.0-beta.1").
_VORAB_MARKER = ("beta", "alpha", "rc", "dev")


def _aktive_dsn() -> str:
    return settings.sentry_dsn if settings.sentry_dsn is not None else PROJECT_DSN


def _sentry_umgebung(version: str) -> str:
    """Tagged Sentry-Events als "beta" oder "production", abhängig von der
    tatsächlich installierten Versionsnummer – nicht vom gewählten
    Update-Kanal (der zeigt nur an, ob ein Update verfügbar ist, sagt aber
    nichts darüber aus, was wirklich läuft, falls jemand manuell einen
    anderen Tag deployed hat)."""
    version_klein = version.lower()
    if any(marker in version_klein for marker in _VORAB_MARKER):
        return "beta"
    return "production"


def init_sentry_wenn_aktiviert(fehlerberichte_aktiv: bool) -> bool:
    """Gibt zurück, ob Sentry tatsächlich initialisiert wurde."""
    dsn = _aktive_dsn()
    if not dsn or not fehlerberichte_aktiv:
        return False

    version = installierte_version()
    umgebung = _sentry_umgebung(version)
    sentry_sdk.init(
        dsn=dsn,
        environment=umgebung,
        release=version,
        # Keine personenbezogenen Daten (IP, Cookies, Request-Body) mitsenden –
        # nur technische Fehlerdetails (Stacktrace, Request-Pfad/-Methode).
        send_default_pii=False,
        traces_sample_rate=0.0,
        integrations=[
            # INFO-Log-Zeilen werden als Breadcrumbs an Fehlerereignisse
            # angehängt (Kontext), WARNING+ wird zusätzlich als eigenes
            # Sentry-Event gemeldet, auch ohne dass dabei eine Exception
            # geworfen wurde (z. B. fehlgeschlagener E-Mail-Versand).
            LoggingIntegration(level=logging.INFO, event_level=logging.WARNING),
        ],
    )
    logger.info("sentry_aktiviert", environment=umgebung, version=version)
    return True
