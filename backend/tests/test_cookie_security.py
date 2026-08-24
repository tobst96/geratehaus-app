"""Regressionstest für den `secure`-Flag auf den langlebigen Session-Cookies
(Sicherheitsaudit-Fund Etappe AD; per `settings.cookies_secure` statt an
`environment` gekoppelt - siehe Etappe AI, wo genau diese Kopplung eine
laufende Instanz ohne HTTPS-Reverse-Proxy ausgesperrt hat)."""

import secrets
from datetime import datetime, timedelta, timezone

import pytest

from app.core import gruppenfuehrer_2fa_session
from app.core.security import hash_secret
from app.models.barcode_token import BarcodeToken
from app.models.person import Person


async def _person_mit_barcode(db, name="Erika Musterfrau"):
    person = Person(name=name)
    db.add(person)
    await db.commit()
    await db.refresh(person)
    token = BarcodeToken(
        person_id=person.id, token=secrets.token_urlsafe(16), ablauf_am=datetime.utcnow() + timedelta(days=1)
    )
    db.add(token)
    await db.commit()
    await db.refresh(token)
    return person, token


async def _gruppenfuehrer_mit_2fa(db, code="123456"):
    m = Person(
        name="mod",
        passwort_hash=hash_secret("geheim123"),
        gruppenfuehrer_rolle="admin",
        email="mod@example.org",
        zwei_faktor_aktiv=True,
        otp_code_hash=hash_secret(code),
        otp_ablauf_am=datetime.now(timezone.utc) + timedelta(minutes=5),
    )
    db.add(m)
    await db.commit()
    await db.refresh(m)
    return m


@pytest.mark.asyncio
async def test_namens_cookie_ohne_secure_per_default(client, db):
    """Default (cookies_secure=False) - auch wenn environment=production ist,
    wie es die conftest-Testumgebung nicht extra überschreibt."""
    _, token = await _person_mit_barcode(db)
    r = await client.post("/api/v1/auth/barcode", json={"token": token.token})
    assert "secure" not in r.headers.get("set-cookie", "").lower()


@pytest.mark.asyncio
async def test_namens_cookie_mit_secure_wenn_explizit_aktiviert(client, db, monkeypatch):
    import app.api.v1.auth as auth_modul

    monkeypatch.setattr(auth_modul.settings, "cookies_secure", True)
    _, token = await _person_mit_barcode(db)
    r = await client.post("/api/v1/auth/barcode", json={"token": token.token})
    assert "secure" in r.headers.get("set-cookie", "").lower()


@pytest.mark.asyncio
async def test_trusted_device_cookie_mit_secure_wenn_explizit_aktiviert(client, db, monkeypatch):
    import app.api.v1.auth as auth_modul

    m = await _gruppenfuehrer_mit_2fa(db)
    challenge = gruppenfuehrer_2fa_session.signiere_challenge(m.id)

    monkeypatch.setattr(auth_modul.settings, "cookies_secure", True)
    r = await client.post(
        "/api/v1/auth/gruppenfuehrer/2fa",
        json={"challenge": challenge, "code": "123456", "angemeldet_bleiben": True},
    )
    assert r.status_code == 200
    set_cookie = r.headers.get("set-cookie", "")
    assert "gruppenfuehrer_trusted_device" in set_cookie
    assert "secure" in set_cookie.lower()
