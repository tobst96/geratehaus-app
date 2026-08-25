from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
import jwt

from app.core.config import settings


def sicherheit_stand_claim(zeitpunkt: datetime | None) -> str | None:
    """Wandelt `Person.sicherheit_geaendert_am` in den JWT-Claim-Wert um (ISO-String,
    da JWT-Claims JSON-serialisierbar sein müssen). Wird sowohl beim Ausstellen eines
    Tokens (`gruppenfuehrer_service.gruppenfuehrer_token`) als auch bei jeder
    Token-Prüfung (`app.api.deps.get_current_gruppenfuehrer`) verwendet, damit beide
    Seiten exakt denselben Vergleichswert bilden – ein Token bleibt nur gültig, wenn
    der Claim exakt dem aktuellen DB-Wert entspricht (Passwortänderung/2FA-Reset
    setzen den DB-Wert neu und entwerten damit alle zuvor ausgestellten Tokens)."""
    return zeitpunkt.isoformat() if zeitpunkt is not None else None


def hash_secret(value: str) -> str:
    """Für Passwörter und PINs gleichermaßen verwendet."""
    return bcrypt.hashpw(value.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_secret(value: str, hashed: str) -> bool:
    return bcrypt.checkpw(value.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(subject: str, extra_claims: dict[str, Any] | None = None) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    payload: dict[str, Any] = {"sub": subject, "exp": expire}
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict[str, Any] | None:
    try:
        return jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except jwt.PyJWTError:
        return None
