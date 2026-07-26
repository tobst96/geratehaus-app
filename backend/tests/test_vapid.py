"""VAPID-Schlüsselgenerierung für Web-Push (korrektes Base64url-Format)."""

import base64

import pytest

from app.core.security import hash_secret
from app.models.person import Person
from app.services.config_service import config_service
from app.services.notifier.webpush import generiere_vapid_schluessel


def _b64url_decode(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def test_generiere_vapid_schluessel_format():
    public, private = generiere_vapid_schluessel()
    pub = _b64url_decode(public)
    priv = _b64url_decode(private)
    # Public: unkomprimierter EC-Punkt (65 Byte, führendes 0x04) – genau das,
    # was der Browser für applicationServerKey erwartet.
    assert len(pub) == 65
    assert pub[0] == 0x04
    assert len(priv) == 32
    # Base64url ohne Padding / ohne +,/ (sonst scheitert atob im Browser).
    for zeichen in ("=", "+", "/"):
        assert zeichen not in public and zeichen not in private


@pytest.mark.asyncio
async def test_vapid_generieren_endpunkt_speichert(client, db):
    admin = Person(name="admin", passwort_hash=hash_secret("geheim123"), gruppenfuehrer_rolle="admin")
    db.add(admin)
    await db.commit()
    login = await client.post(
        "/api/v1/auth/gruppenfuehrer/login", data={"username": "admin", "password": "geheim123"}
    )
    token = login.json()["access_token"]

    r = await client.post(
        "/api/v1/gruppenfuehrer/einstellungen/vapid-generieren",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200
    body = r.json()
    assert _b64url_decode(body["public_key"])[0] == 0x04

    gespeichert = await config_service.get(db, "notifier_webpush_vapid_public_key")
    assert gespeichert == body["public_key"]
