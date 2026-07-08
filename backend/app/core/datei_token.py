"""Signierte, kurzlebige Token-Links für sensible Upload-Dateien.

Profilbilder (`/uploads/personen/…`) lagen bisher unter einem **dauerhaft
öffentlichen** Static-Mount. Zwar sind die Dateinamen seit Phase 1 nicht mehr
abzählbar (Zufallstoken statt `person-<id>`), aber wer eine URL einmal kennt
(Browser-Verlauf, geteilter Link, Logs), konnte sie **unbegrenzt und ohne
Anmeldung** abrufen.

Lösung: Die geschützten Pfade werden nur noch gegen einen **signierten,
zeitlich begrenzten** `?token=` ausgeliefert (siehe `GeschuetzteUploads` in
`main.py`). Den Token stellt der Server **nur in berechtigten Antwortpfaden**
aus (Personen-Konvertierung, Login-/Reservierungs-Vorschauen) – ein `<img>`
sendet keine Auth-Header, deshalb wandert die Berechtigung in den signierten
Query-Parameter. Der Token bindet den **exakten Pfad** (kein Vertauschen) und
läuft nach `datei_token_max_age_stunden` ab.

Signatur über `cookie_secret_key` (wie die Mitglieder-Session), damit kein
neues Secret nötig ist.
"""

from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from app.core.config import settings

# Nur diese Unterverzeichnisse von `/uploads` sind geschützt. Das Logo
# (`/uploads/<name>.png`) bleibt bewusst öffentlich – es ist nicht
# personenbezogen und wird u. a. in E-Mails/PDFs referenziert.
GESCHUETZTE_PRAEFIXE = ("personen/",)

_serializer = URLSafeTimedSerializer(settings.cookie_secret_key, salt="datei-token")


def ist_geschuetzt(relativer_pfad: str) -> bool:
    """True, wenn der Pfad (relativ zum Upload-Verzeichnis, ohne führenden
    Slash) einen Token erfordert."""
    return relativer_pfad.startswith(GESCHUETZTE_PRAEFIXE)


def signiere_pfad(relativer_pfad: str) -> str:
    """Erzeugt den Token, der genau diesen Pfad freischaltet."""
    return _serializer.dumps(relativer_pfad)


def pfad_gueltig(token: str | None, relativer_pfad: str) -> bool:
    """Prüft, ob `token` gültig, nicht abgelaufen und für **genau** diesen Pfad
    ausgestellt ist."""
    if not token:
        return False
    max_age = settings.datei_token_max_age_stunden * 3600
    try:
        erlaubter_pfad = _serializer.loads(token, max_age=max_age)
    except (BadSignature, SignatureExpired):
        return False
    return erlaubter_pfad == relativer_pfad


def signierte_url(url: str | None) -> str | None:
    """Hängt an eine `/uploads/…`-URL einen Freischalt-Token an, sofern der
    Pfad geschützt ist. Öffentliche Pfade (Logo) und Nicht-Upload-Werte bleiben
    unverändert – idempotent genug für die zentrale Personen-Konvertierung."""
    if not url or not url.startswith("/uploads/"):
        return url
    relativer_pfad = url[len("/uploads/") :]
    # Query bereits vorhanden (schon signiert) → nicht doppelt anhängen.
    if "?" in relativer_pfad:
        return url
    if not ist_geschuetzt(relativer_pfad):
        return url
    return f"{url}?token={signiere_pfad(relativer_pfad)}"
