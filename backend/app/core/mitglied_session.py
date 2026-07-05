"""Signierte Mitglieder-Session (Namens-Cookie).

Früher enthielt das `geraetehaus_name`-Cookie den Klartext-Namen und war damit
frei fälschbar – jeder konnte sich per gesetztem Cookie als beliebige Person
ausgeben (auf der öffentlich erreichbaren Instanz ein Auth-Loch). Das Cookie
enthält jetzt einen **signierten** Wert, der ausschließlich nach echter
Identifikation (Barcode-Scan oder Name+PIN) ausgestellt wird und serverseitig
über den `cookie_secret_key` verifiziert wird. Das Cookie bleibt httponly und
wird vom Frontend nie gelesen – die Umstellung ist rein serverseitig.
"""

from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from app.core.config import settings

# Gleiche Lebensdauer wie bisher (persistenter Mitglieder-Login von zu Hause).
MITGLIED_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 365 * 5  # 5 Jahre

_serializer = URLSafeTimedSerializer(settings.cookie_secret_key, salt="mitglied-session")


def signiere_name(name: str) -> str:
    """Erzeugt den signierten Cookie-Wert für einen (bereits identifizierten) Namen."""
    return _serializer.dumps(name)


def lese_name(cookie_wert: str | None) -> str | None:
    """Gibt den Namen aus einem gültig signierten Cookie zurück, sonst None
    (fehlend, manipuliert oder abgelaufen)."""
    if not cookie_wert:
        return None
    try:
        name = _serializer.loads(cookie_wert, max_age=MITGLIED_SESSION_MAX_AGE_SECONDS)
    except (BadSignature, SignatureExpired):
        return None
    return name if isinstance(name, str) else None
