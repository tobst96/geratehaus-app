"""Signierte Kurzzeit-Token für den Moderator-2FA-Flow.

`challenge`: nach korrektem Passwort ausgestellt, beweist im zweiten Schritt
(`POST /auth/moderator/2fa`), dass das Passwort bereits geprüft wurde – enthält
nur die Moderator-ID und ist kurzlebig (10 Min). Verhindert, dass der
OTP-Schritt ohne vorherige Passwortprüfung aufgerufen werden kann.
"""

from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from app.core.config import settings

CHALLENGE_MAX_AGE_SECONDS = 60 * 10  # 10 Minuten

_challenge_serializer = URLSafeTimedSerializer(
    settings.cookie_secret_key, salt="moderator-2fa-challenge"
)


def signiere_challenge(moderator_id: int) -> str:
    return _challenge_serializer.dumps(moderator_id)


def lese_challenge(token: str | None) -> int | None:
    if not token:
        return None
    try:
        wert = _challenge_serializer.loads(token, max_age=CHALLENGE_MAX_AGE_SECONDS)
    except (BadSignature, SignatureExpired):
        return None
    return wert if isinstance(wert, int) else None
