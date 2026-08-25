"""Admin-/Gruppenführer-2FA per E-Mail-OTP (Etappe P4): opt-in, OTP-Login,
Recovery-Codes, Trusted-Device, Admin-Reset."""

from datetime import datetime, timedelta, timezone

import pytest

from app.core import gruppenfuehrer_2fa_session
from app.core.security import hash_secret
from app.models.person import Person
from app.services import zwei_faktor_service


async def _gruppenfuehrer(db, username="mod", rolle="admin", email="mod@example.org", passwort="geheim123"):
    m = Person(
        name=username, passwort_hash=hash_secret(passwort), gruppenfuehrer_rolle=rolle, email=email
    )
    db.add(m)
    await db.commit()
    await db.refresh(m)
    return m


async def _login_headers(client, email="mod@example.org", passwort="geheim123"):
    r = await client.post(
        "/api/v1/auth/gruppenfuehrer/login", data={"username": email, "password": passwort}
    )
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


async def _otp_setzen(db, gruppenfuehrer, code="123456"):
    gruppenfuehrer.zwei_faktor_aktiv = True
    gruppenfuehrer.otp_code_hash = hash_secret(code)
    gruppenfuehrer.otp_ablauf_am = datetime.now(timezone.utc) + timedelta(minutes=5)
    gruppenfuehrer.otp_versuche = 0
    await db.commit()


@pytest.mark.asyncio
async def test_login_ohne_2fa_liefert_token(client, db):
    await _gruppenfuehrer(db)
    r = await client.post(
        "/api/v1/auth/gruppenfuehrer/login", data={"username": "mod@example.org", "password": "geheim123"}
    )
    assert r.status_code == 200
    assert r.json()["access_token"]
    assert r.json()["zwei_faktor_erforderlich"] is False


@pytest.mark.asyncio
async def test_2fa_aktivieren_liefert_recovery_codes(client, db):
    await _gruppenfuehrer(db)
    h = await _login_headers(client)
    r = await client.post("/api/v1/gruppenfuehrer/konto/2fa/aktivieren", headers=h)
    assert r.status_code == 200
    assert len(r.json()["codes"]) == zwei_faktor_service.RECOVERY_CODE_ANZAHL

    status = await client.get("/api/v1/gruppenfuehrer/konto/2fa", headers=h)
    assert status.json() == {"aktiv": True, "email_gesetzt": True}


@pytest.mark.asyncio
async def test_2fa_aktivieren_ohne_email_400(client, db):
    # Ohne E-Mail ist auch kein Passwort-Login mehr möglich (läuft über E-Mail) -
    # Token direkt erzeugen, um isoliert das 2FA-Aktivieren-Verhalten zu prüfen.
    from app.services.gruppenfuehrer_service import gruppenfuehrer_token

    m = await _gruppenfuehrer(db, email=None)
    h = {"Authorization": f"Bearer {gruppenfuehrer_token(m)}"}
    r = await client.post("/api/v1/gruppenfuehrer/konto/2fa/aktivieren", headers=h)
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_login_mit_2fa_verlangt_code(client, db):
    m = await _gruppenfuehrer(db)
    m.zwei_faktor_aktiv = True
    await db.commit()
    r = await client.post(
        "/api/v1/auth/gruppenfuehrer/login", data={"username": "mod@example.org", "password": "geheim123"}
    )
    assert r.status_code == 200
    body = r.json()
    assert body["access_token"] is None
    assert body["zwei_faktor_erforderlich"] is True
    assert body["challenge"]


@pytest.mark.asyncio
async def test_2fa_mit_korrektem_otp_liefert_token(client, db):
    m = await _gruppenfuehrer(db)
    await _otp_setzen(db, m, "654321")
    challenge = gruppenfuehrer_2fa_session.signiere_challenge(m.id)
    r = await client.post(
        "/api/v1/auth/gruppenfuehrer/2fa", json={"challenge": challenge, "code": "654321"}
    )
    assert r.status_code == 200
    assert r.json()["access_token"]


@pytest.mark.asyncio
async def test_2fa_falscher_code_401(client, db):
    m = await _gruppenfuehrer(db)
    await _otp_setzen(db, m, "111111")
    challenge = gruppenfuehrer_2fa_session.signiere_challenge(m.id)
    r = await client.post(
        "/api/v1/auth/gruppenfuehrer/2fa", json={"challenge": challenge, "code": "000000"}
    )
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_2fa_mit_recovery_code(client, db):
    m = await _gruppenfuehrer(db)
    codes = await zwei_faktor_service.aktivieren(db, m)  # aktiviert + Codes
    challenge = gruppenfuehrer_2fa_session.signiere_challenge(m.id)
    r = await client.post(
        "/api/v1/auth/gruppenfuehrer/2fa", json={"challenge": challenge, "code": codes[0]}
    )
    assert r.status_code == 200
    assert r.json()["access_token"]
    # Recovery-Code ist verbraucht → zweite Nutzung schlägt fehl.
    r2 = await client.post(
        "/api/v1/auth/gruppenfuehrer/2fa", json={"challenge": challenge, "code": codes[0]}
    )
    assert r2.status_code == 401


@pytest.mark.asyncio
async def test_trusted_device_ueberspringt_2fa(client, db):
    m = await _gruppenfuehrer(db)
    await _otp_setzen(db, m, "222222")
    challenge = gruppenfuehrer_2fa_session.signiere_challenge(m.id)
    # Mit "angemeldet bleiben" → Trusted-Device-Cookie wird gesetzt (im Client-Jar).
    r = await client.post(
        "/api/v1/auth/gruppenfuehrer/2fa",
        json={"challenge": challenge, "code": "222222", "angemeldet_bleiben": True},
    )
    assert r.status_code == 200
    # Erneuter Login: dank Trusted-Device direkt ein Token, kein 2FA nötig.
    r2 = await client.post(
        "/api/v1/auth/gruppenfuehrer/login", data={"username": "mod@example.org", "password": "geheim123"}
    )
    assert r2.json()["access_token"]
    assert r2.json()["zwei_faktor_erforderlich"] is False


@pytest.mark.asyncio
async def test_admin_reset_2fa(client, db):
    admin = await _gruppenfuehrer(db, username="admin", email="a@example.org")
    ziel = await _gruppenfuehrer(db, username="kollege", email="k@example.org")
    await zwei_faktor_service.aktivieren(db, ziel)
    h = await _login_headers(client, "a@example.org")

    r = await client.post(
        f"/api/v1/gruppenfuehrer/stammdaten/personen/{ziel.id}/2fa-zuruecksetzen", headers=h
    )
    assert r.status_code == 204
    await db.refresh(ziel)
    assert ziel.zwei_faktor_aktiv is False


@pytest.mark.asyncio
async def test_token_wird_nach_2fa_reset_ungueltig(client, db):
    """Regressionstest: ein VOR dem 2FA-Reset ausgestelltes JWT der betroffenen
    (Ziel-)Person muss danach abgelehnt werden - der Reset ist als Reaktion auf ein
    kompromittiertes Konto gedacht und darf laufende Sessions nicht überleben lassen.
    Das Token der ausführenden Admin-Person bleibt unberührt (nur ihr eigenes
    Token wäre relevant, falls sie sich selbst zurücksetzt - hier isoliert geprüft)."""
    from app.services.gruppenfuehrer_service import gruppenfuehrer_token

    admin = await _gruppenfuehrer(db, username="admin", email="a@example.org")
    ziel = await _gruppenfuehrer(db, username="kollege", email="k@example.org")
    await zwei_faktor_service.aktivieren(db, ziel)
    admin_headers = await _login_headers(client, "a@example.org")
    # Ziel hat aktives 2FA - Token direkt erzeugen (wie nach abgeschlossenem
    # 2FA-Login), statt über den reinen Passwort-Login (der bei aktivem 2FA nur
    # eine Challenge zurückgibt, siehe test_login_mit_2fa_verlangt_code).
    ziel_headers = {"Authorization": f"Bearer {gruppenfuehrer_token(ziel)}"}

    # Vorher: Ziel-Token funktioniert.
    r = await client.get("/api/v1/gruppenfuehrer/konto/2fa", headers=ziel_headers)
    assert r.status_code == 200

    reset = await client.post(
        f"/api/v1/gruppenfuehrer/stammdaten/personen/{ziel.id}/2fa-zuruecksetzen",
        headers=admin_headers,
    )
    assert reset.status_code == 204

    # Danach: dasselbe, alte Token der Ziel-Person wird abgelehnt.
    r = await client.get("/api/v1/gruppenfuehrer/konto/2fa", headers=ziel_headers)
    assert r.status_code == 401
