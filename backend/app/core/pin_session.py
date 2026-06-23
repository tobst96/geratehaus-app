"""Signierte Session für den PIN-Außenzugriff.

Nach erfolgreicher PIN-Verifizierung wird ein signiertes Cookie ausgestellt,
damit nicht bei jedem Request erneut der PIN übertragen werden muss. Das
Cookie bindet sich an die Personen-ID und läuft nach PIN_SESSION_MAX_AGE ab.
"""

from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from app.core.config import settings

PIN_SESSION_COOKIE = "pin_session"
PIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30  # 30 Tage

_serializer = URLSafeTimedSerializer(settings.cookie_secret_key, salt="pin-aussenzugriff")


def erstelle_pin_session(person_id: int) -> str:
    return _serializer.dumps({"person_id": person_id})


def lese_pin_session(token: str) -> int | None:
    try:
        data = _serializer.loads(token, max_age=PIN_SESSION_MAX_AGE_SECONDS)
    except (BadSignature, SignatureExpired):
        return None
    return data.get("person_id")
