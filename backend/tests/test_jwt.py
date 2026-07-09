"""JWT-Handling (nach Migration python-jose → PyJWT): Erzeugen/Prüfen von
Gruppenführer-Access-Tokens. Sicherheitsrelevant – manipulierte, falsch signierte
oder abgelaufene Tokens dürfen NICHT akzeptiert werden."""

from datetime import datetime, timedelta, timezone

import jwt

from app.core.config import settings
from app.core.security import create_access_token, decode_access_token


def test_roundtrip_enthaelt_claims():
    token = create_access_token("admin", {"rolle": "admin"})
    daten = decode_access_token(token)
    assert daten is not None
    assert daten["sub"] == "admin"
    assert daten["rolle"] == "admin"


def test_manipulierter_token_abgelehnt():
    token = create_access_token("admin")
    # Ein Zeichen im Payload/Signaturteil verändern → ungültige Signatur.
    verfälscht = token[:-2] + ("aa" if token[-2:] != "aa" else "bb")
    assert decode_access_token(verfälscht) is None


def test_falsche_signatur_abgelehnt():
    # Mit fremdem Secret signiert → darf nicht durchgehen.
    fremd = jwt.encode(
        {"sub": "admin", "exp": datetime.now(timezone.utc) + timedelta(minutes=5)},
        "ein-anderes-secret",
        algorithm=settings.jwt_algorithm,
    )
    assert decode_access_token(fremd) is None


def test_abgelaufener_token_abgelehnt():
    abgelaufen = jwt.encode(
        {"sub": "admin", "exp": datetime.now(timezone.utc) - timedelta(minutes=1)},
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )
    assert decode_access_token(abgelaufen) is None


def test_muell_token_abgelehnt():
    assert decode_access_token("kein.jwt.token") is None
    assert decode_access_token("") is None
