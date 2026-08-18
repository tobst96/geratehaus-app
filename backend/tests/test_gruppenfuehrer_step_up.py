"""Wechsel vom Mitgliederbereich (Namens-Cookie) in den Gruppenführer-/
Admin-Bereich ohne erneute Passworteingabe (`POST /auth/gruppenfuehrer/step-up`)."""

import pytest

from app.core import gruppenfuehrer_2fa_session
from app.core.security import hash_secret
from app.models.person import Person
from app.services.config_service import config_service


async def _person(db, name="Max Muster", passwort="geheim123", rolle=None, email="max@example.org"):
    p = Person(
        name=name,
        passwort_hash=hash_secret(passwort) if passwort else None,
        gruppenfuehrer_rolle=rolle,
        email=email,
    )
    db.add(p)
    await db.commit()
    await db.refresh(p)
    return p


async def _pflicht(db, an: bool) -> None:
    await config_service.set(db, "zwei_faktor_pflicht", an)


async def _mitglied_einloggen(client, email: str, passwort: str) -> None:
    r = await client.post("/api/v1/auth/mitglied-login", json={"email": email, "passwort": passwort})
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_step_up_ohne_2fa_pflicht_liefert_token(client, db):
    await _pflicht(db, False)
    await _person(db, rolle="admin")
    await _mitglied_einloggen(client, "max@example.org", "geheim123")

    r = await client.post("/api/v1/auth/gruppenfuehrer/step-up")
    assert r.status_code == 200
    assert r.json()["access_token"]


@pytest.mark.asyncio
async def test_step_up_ohne_erhoehten_zugang_403(client, db):
    await _pflicht(db, False)
    await _person(db, rolle=None)  # normales Mitglied, kein Gruppenführer
    await _mitglied_einloggen(client, "max@example.org", "geheim123")

    r = await client.post("/api/v1/auth/gruppenfuehrer/step-up")
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_step_up_ohne_mitglied_cookie_401(client, db):
    r = await client.post("/api/v1/auth/gruppenfuehrer/step-up")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_step_up_mit_2fa_pflicht_liefert_einrichtung(client, db):
    await _pflicht(db, True)
    await config_service.set(db, "notifier_email_smtp_host", "smtp.example.org")
    await _person(db, rolle="gruppenfuehrer")
    await _mitglied_einloggen(client, "max@example.org", "geheim123")

    r = await client.post("/api/v1/auth/gruppenfuehrer/step-up")
    assert r.status_code == 200
    body = r.json()
    assert body["access_token"] is None
    assert body["einrichtung_erforderlich"] is True
    assert body["email_gesetzt"] is True
    assert body["challenge"]


@pytest.mark.asyncio
async def test_step_up_ohne_smtp_liefert_token_statt_einrichtung(client, db):
    """Regression: ohne konfiguriertes SMTP darf der Step-up nicht in der
    Pflicht-Einrichtung hängen bleiben (Anmelde-Code käme nie an)."""
    await _pflicht(db, True)
    await _person(db, rolle="admin")  # SMTP bewusst NICHT konfiguriert
    await _mitglied_einloggen(client, "max@example.org", "geheim123")

    r = await client.post("/api/v1/auth/gruppenfuehrer/step-up")
    assert r.status_code == 200
    body = r.json()
    assert body["access_token"]
    assert body["einrichtung_erforderlich"] is False


@pytest.mark.asyncio
async def test_step_up_mit_aktivem_2fa_verlangt_otp(client, db):
    await _pflicht(db, False)
    p = await _person(db, rolle="admin")
    from app.services import zwei_faktor_service

    await zwei_faktor_service.aktivieren(db, p)
    await _mitglied_einloggen(client, "max@example.org", "geheim123")

    r = await client.post("/api/v1/auth/gruppenfuehrer/step-up")
    assert r.status_code == 200
    body = r.json()
    assert body["access_token"] is None
    assert body["zwei_faktor_erforderlich"] is True
    assert body["challenge"]


async def _otp_setzen(db, person, code="222222") -> None:
    person.zwei_faktor_aktiv = True
    person.otp_code_hash = hash_secret(code)
    from datetime import datetime, timedelta, timezone

    person.otp_ablauf_am = datetime.now(timezone.utc) + timedelta(minutes=5)
    person.otp_versuche = 0
    await db.commit()


@pytest.mark.asyncio
async def test_step_up_trusted_device_ueberspringt_2fa(client, db):
    await _pflicht(db, False)
    p = await _person(db, rolle="admin")
    await _otp_setzen(db, p, "222222")
    await _mitglied_einloggen(client, "max@example.org", "geheim123")

    challenge = gruppenfuehrer_2fa_session.signiere_challenge(p.id)
    r = await client.post(
        "/api/v1/auth/gruppenfuehrer/2fa",
        json={"challenge": challenge, "code": "222222", "angemeldet_bleiben": True},
    )
    assert r.status_code == 200

    r2 = await client.post("/api/v1/auth/gruppenfuehrer/step-up")
    assert r2.status_code == 200
    assert r2.json()["access_token"]
    assert r2.json()["zwei_faktor_erforderlich"] is False


@pytest.mark.asyncio
async def test_step_up_wird_rate_limitiert(client, db):
    await _pflicht(db, False)
    await _person(db, rolle="admin")
    await _mitglied_einloggen(client, "max@example.org", "geheim123")

    antworten = [await client.post("/api/v1/auth/gruppenfuehrer/step-up") for _ in range(11)]
    assert antworten[-1].status_code == 429
    assert any(a.status_code == 200 for a in antworten[:10])


@pytest.mark.asyncio
async def test_mein_profil_liefert_gruppenfuehrer_rolle(client, db):
    await _person(db, name="Normalo", rolle=None, email="normalo@example.org")
    await _person(db, name="Chefin", rolle="admin", email="chefin@example.org")

    await _mitglied_einloggen(client, "normalo@example.org", "geheim123")
    r = await client.get("/api/v1/auth/mein-profil")
    assert r.json()["gruppenfuehrer_rolle"] is None

    await _mitglied_einloggen(client, "chefin@example.org", "geheim123")
    r2 = await client.get("/api/v1/auth/mein-profil")
    assert r2.json()["gruppenfuehrer_rolle"] == "admin"
