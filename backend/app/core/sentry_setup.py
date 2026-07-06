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

import asyncio
import logging

import sentry_sdk
import structlog
from packaging.version import InvalidVersion, Version
from sentry_sdk.integrations.asyncio import AsyncioIntegration
from sentry_sdk.integrations.logging import LoggingIntegration

from app.core.config import settings
from app.services.update_service import installierte_version

logger = structlog.get_logger(__name__)

PROJECT_DSN = (
    "https://68e023a6b238e5694ba132671c87d31f@o4511632673669120.ingest.de.sentry.io/4511632679436368"
)


def _aktive_dsn() -> str:
    return settings.sentry_dsn if settings.sentry_dsn is not None else PROJECT_DSN


def aktuelle_umgebung() -> str:
    """Öffentlich nutzbar (z. B. für die Frontend-Konfiguration): beta/production
    anhand der tatsächlich installierten Version."""
    return _sentry_umgebung(installierte_version())


def _sentry_umgebung(version: str) -> str:
    """Tagged Sentry-Events als "beta" oder "production", abhängig von der
    tatsächlich installierten Versionsnummer – nicht vom gewählten
    Update-Kanal (der zeigt nur an, ob ein Update verfügbar ist, sagt aber
    nichts darüber aus, was wirklich läuft, falls jemand manuell einen
    anderen Tag deployed hat). `importlib.metadata.version()` liefert die
    PEP-440-normalisierte Form (z. B. "0.3.0b1" statt "0.3.0-beta.1") –
    daher echtes Parsen statt Substring-Suche nach "beta"."""
    try:
        return "beta" if Version(version).is_prerelease else "production"
    except InvalidVersion:
        return "production"


# Log-Events, die bereits an anderer Stelle sauber behandelt und dem Admin
# gemeldet werden (Fehler-Mail + Status im Backup-Browser) und deshalb keinen
# unerwarteten Code-Fehler darstellen. Sie sollen als Log-Zeile erhalten
# bleiben, aber kein eigenes Sentry-Issue erzeugen (sonst nur Rauschen).
_UNTERDRUECKTE_LOG_EVENTS = ("backup_fehlgeschlagen",)


def _ist_cancelled_error(event, hint) -> bool:
    """Erkennt `asyncio.CancelledError` – entsteht z. B. beim Recyceln/Beenden
    einer DB-Pool-Verbindung oder bei einem Client-Disconnect. Das ist kein
    Code-Fehler, sondern erwartetes Rauschen und soll kein Sentry-Issue erzeugen.
    Prüft sowohl die rohe Exception (`hint`) als auch die von Sentry
    serialisierten Exception-Typen im Event."""
    exc_info = hint.get("exc_info")
    if exc_info and exc_info[0] is not None:
        try:
            if issubclass(exc_info[0], asyncio.CancelledError):
                return True
        except TypeError:
            pass
    for wert in ((event.get("exception") or {}).get("values") or []):
        if wert.get("type") == "CancelledError":
            return True
    return False


def _before_send(event, hint):
    """Verwirft Sentry-Events für bereits behandelte Betriebsfehler (z. B. ein
    fehlgeschlagenes Backup wegen falsch konfiguriertem Ziel) sowie erwartetes
    Rauschen (`CancelledError`). Echte, unerwartete Fehler bleiben unberührt."""
    if _ist_cancelled_error(event, hint):
        return None
    # Bei via LoggingIntegration erzeugten Events keine Exception -> nur wenn
    # es KEIN Exception-Event ist, überhaupt filtern.
    if "exc_info" in hint:
        return event
    nachricht = ""
    logentry = event.get("logentry") or {}
    nachricht = logentry.get("message") or event.get("message") or ""
    if any(marker in nachricht for marker in _UNTERDRUECKTE_LOG_EVENTS):
        return None
    return event


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
        # Performance-Monitoring (Transaktionen/Spans) + Profiling für einen
        # Bruchteil der Requests – genug für Trends, ohne die Instanz zu belasten
        # oder das Sentry-Kontingent zu sprengen.
        traces_sample_rate=0.15,
        profiles_sample_rate=0.15,
        before_send=_before_send,
        # Aktiviert die Sentry Logs API (sichtbar unter "Logs" in der Sentry-UI)
        # zusätzlich zu den klassischen Issues.
        enable_logs=True,
        integrations=[
            # INFO-Log-Zeilen werden als Breadcrumbs an Fehlerereignisse
            # angehängt (Kontext), WARNING+ wird zusätzlich als eigenes
            # Sentry-Event gemeldet, auch ohne dass dabei eine Exception
            # geworfen wurde (z. B. fehlgeschlagener E-Mail-Versand).
            LoggingIntegration(level=logging.INFO, event_level=logging.WARNING),
            # Korrekte Trace-Verknüpfung über die vielen asyncio-Tasks
            # (Scheduler-Jobs, Hintergrund-Tasks). FastAPI/Starlette/SQLAlchemy
            # werden von sentry-sdk[fastapi] automatisch instrumentiert.
            AsyncioIntegration(),
        ],
    )
    logger.info("sentry_aktiviert", environment=umgebung, version=version)
    return True
