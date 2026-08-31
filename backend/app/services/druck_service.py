"""Best-Effort-Druck eines PDF an einen Netzwerkdrucker per IPP.

Bewusst **ohne Zusatz-Abhängigkeit**: ein minimaler IPP-`Print-Job`-Request
(RFC 8010/8011) wird von Hand kodiert und über das ohnehin vorhandene `httpx`
verschickt. Zieldrucker ist ein Netzwerkdrucker mit IPP/CUPS im LAN, die URL
wird als `drucker_ipp_url` in `app_config` gepflegt (z. B.
``ipp://drucker.local:631/ipp/print``).

Eingesetzt als Fallback, wenn der PDF-Mailversand scheitert, sowie optional als
„immer ausdrucken" beim Einsatz-/Dienstbuch-Abschluss (Etappe K). Seit Etappe AA
auch als Fallback für den 2FA-Anmelde-Code (`zwei_faktor_service`), wenn dessen
Mailversand scheitert – der Drucker kennt dabei nur „ein PDF drucken", die
inhaltliche Aufbereitung (Einsatzbericht vs. Anmelde-Code) übernimmt jeweils der
aufrufende Service über `pdf_service`. Druckfehler werden nur protokolliert
(Best-Effort) – außer beim gezielten Testdruck, der den Fehler bewusst nach
außen gibt (analog Testmail).
"""

from urllib.parse import urlsplit, urlunsplit

import httpx
import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.config_service import config_service

logger = structlog.get_logger(__name__)

# IPP-Tags (RFC 8010).
_TAG_OPERATION_ATTRIBUTES = 0x01
_TAG_END_OF_ATTRIBUTES = 0x03
_TAG_CHARSET = 0x47
_TAG_NATURAL_LANGUAGE = 0x48
_TAG_URI = 0x45
_TAG_NAME = 0x42  # nameWithoutLanguage
_TAG_MIME_MEDIA_TYPE = 0x49

_OP_PRINT_JOB = 0x0002
# Version 1.1 wird von praktisch allen IPP-Druckern/CUPS unterstützt.
_VERSION = (0x01, 0x01)
_BENUTZER = "geraetehaus"


class DruckFehler(Exception):
    """Der IPP-Druck ist fehlgeschlagen (Netzwerk, HTTP- oder IPP-Statusfehler)."""


def _attribut(tag: int, name: str, wert: str) -> bytes:
    """Kodiert ein einzelnes IPP-Attribut: tag(1) name-len(2) name value-len(2) value."""
    name_b = name.encode("ascii")
    wert_b = wert.encode("utf-8")
    return (
        bytes([tag])
        + len(name_b).to_bytes(2, "big")
        + name_b
        + len(wert_b).to_bytes(2, "big")
        + wert_b
    )


def _baue_print_job(printer_uri: str, pdf_inhalt: bytes) -> bytes:
    """Baut den binären IPP-`Print-Job`-Request inklusive angehängtem PDF."""
    kopf = bytes([_VERSION[0], _VERSION[1]])
    kopf += _OP_PRINT_JOB.to_bytes(2, "big")
    kopf += (1).to_bytes(4, "big")  # request-id

    attribute = bytes([_TAG_OPERATION_ATTRIBUTES])
    # Reihenfolge ist vorgeschrieben: charset zuerst, dann natural-language.
    attribute += _attribut(_TAG_CHARSET, "attributes-charset", "utf-8")
    attribute += _attribut(_TAG_NATURAL_LANGUAGE, "attributes-natural-language", "de")
    attribute += _attribut(_TAG_URI, "printer-uri", printer_uri)
    attribute += _attribut(_TAG_NAME, "requesting-user-name", _BENUTZER)
    attribute += _attribut(_TAG_MIME_MEDIA_TYPE, "document-format", "application/pdf")
    attribute += bytes([_TAG_END_OF_ATTRIBUTES])

    return kopf + attribute + pdf_inhalt


def _http_ziel(ipp_url: str) -> str:
    """Wandelt die IPP-URL in die HTTP(S)-Transport-URL um: ``ipp`` → ``http``,
    ``ipps`` → ``https``; fehlender Port wird auf 631 gesetzt. Andere Schemata
    (``http``/``https``) bleiben unverändert."""
    teile = urlsplit(ipp_url)
    schema = teile.scheme.lower()
    if schema == "ipp":
        schema = "http"
    elif schema == "ipps":
        schema = "https"
    netloc = teile.netloc
    if teile.port is None and teile.hostname:
        netloc = f"{teile.hostname}:631"
    return urlunsplit((schema, netloc, teile.path or "/", teile.query, ""))


async def drucke_pdf(ipp_url: str, pdf_inhalt: bytes) -> None:
    """Druckt `pdf_inhalt` an den Drucker unter `ipp_url`. Wirft `DruckFehler`
    bei ungültiger URL, Netzwerk-, HTTP- oder IPP-Statusfehler."""
    ipp_url = (ipp_url or "").strip()
    if not ipp_url:
        raise DruckFehler("Keine Drucker-URL konfiguriert.")
    teile = urlsplit(ipp_url)
    if not teile.hostname:
        raise DruckFehler(f"Ungültige Drucker-URL: {ipp_url!r}")

    # printer-uri im IPP-Body bleibt die (IPP-)Originaladresse; der HTTP-POST
    # geht an die transportierte http(s)-Adresse.
    body = _baue_print_job(ipp_url, pdf_inhalt)
    ziel = _http_ziel(ipp_url)
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            antwort = await client.post(
                ziel, content=body, headers={"Content-Type": "application/ipp"}
            )
    except httpx.HTTPError as exc:
        raise DruckFehler(f"Drucker nicht erreichbar: {exc}") from exc

    if antwort.status_code != 200:
        raise DruckFehler(f"Drucker antwortete mit HTTP {antwort.status_code}.")

    # IPP-Statuscode steht in Byte 2–3 der Antwort; < 0x0100 = erfolgreich.
    inhalt = antwort.content
    if len(inhalt) < 4:
        raise DruckFehler("Unerwartete (leere) IPP-Antwort des Druckers.")
    ipp_status = int.from_bytes(inhalt[2:4], "big")
    if ipp_status >= 0x0100:
        raise DruckFehler(f"Drucker lehnte den Auftrag ab (IPP-Status 0x{ipp_status:04x}).")


async def ist_konfiguriert(db: AsyncSession) -> bool:
    """Ist ein Netzwerkdrucker-Fallback aktiviert? Reine Config-Abfrage (prüft
    nicht die Erreichbarkeit) – z. B. genutzt, um zu entscheiden, ob neben
    E-Mail ein zweiter Versandweg für den 2FA-Anmelde-Code existiert."""
    return bool(await config_service.get(db, "drucker_aktiv", False))


async def drucke_pdf_falls_konfiguriert(db: AsyncSession, pdf_inhalt: bytes) -> bool:
    """Best-Effort-Druck über die konfigurierte `drucker_ipp_url`. Voraussetzung:
    `drucker_aktiv`. Fehler werden nur protokolliert (kein Weiterwurf) und mit
    `False` signalisiert; Erfolg mit `True`."""
    if not await ist_konfiguriert(db):
        return False
    ipp_url = str(await config_service.get(db, "drucker_ipp_url", "") or "")
    try:
        await drucke_pdf(ipp_url, pdf_inhalt)
        return True
    except DruckFehler:
        logger.warning("druck_fehlgeschlagen", exc_info=True)
        return False


async def test_drucken(db: AsyncSession) -> None:
    """Sendet eine kleine Test-PDF an den konfigurierten Drucker. Wirft
    `DruckFehler` weiter (für den Testdruck-Endpunkt, analog Testmail)."""
    if not await ist_konfiguriert(db):
        raise DruckFehler("Der Netzwerkdrucker ist nicht aktiviert.")
    ipp_url = str(await config_service.get(db, "drucker_ipp_url", "") or "")
    await drucke_pdf(ipp_url, _TEST_PDF)


# Minimale, gültige 1-seitige PDF („Testdruck Gerätehaus.app") – ohne PDF-Renderer,
# damit der Testdruck keine weiteren Bausteine (WeasyPrint) benötigt.
_TEST_PDF = (
    b"%PDF-1.4\n"
    b"1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
    b"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n"
    b"3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]"
    b"/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>endobj\n"
    b"4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n"
    b"5 0 obj<</Length 68>>stream\n"
    b"BT /F1 24 Tf 72 760 Td (Testdruck Geraetehaus.app) Tj ET\n"
    b"endstream endobj\n"
    b"xref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n"
    b"0000000052 00000 n \n0000000101 00000 n \n0000000209 00000 n \n"
    b"0000000276 00000 n \n"
    b"trailer<</Size 6/Root 1 0 R>>\nstartxref\n394\n%%EOF\n"
)
