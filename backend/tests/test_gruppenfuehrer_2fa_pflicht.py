"""2FA-Pflicht (Config-Default an): erhöhte Konten ohne aktives 2FA müssen es
beim Login erzwungen einrichten, bevor ein Token ausgestellt wird."""

import pytest

from app.core import gruppenfuehrer_2fa_session
from app.core.security import hash_secret
from app.models.person import Person
from app.services.config_service import config_service


async def _gf(db, username="mod", email="mod@example.org", passwort="geheim123"):
    m = Person(
        name=username, passwort_hash=hash_secret(passwort), gruppenfuehrer_rolle="admin", email=email
    )
    db.add(m)
    await db.commit()
    await db.refresh(m)
    return m


async def _pflicht(db, an: bool) -> None:
    await config_service.set(db, "zwei_faktor_pflicht", an)


async def _smtp_konfigurieren(db) -> None:
    await config_service.set(db, "notifier_email_smtp_host", "smtp.example.org")


@pytest.mark.asyncio
async def test_login_pflicht_ohne_2fa_verlangt_einrichtung(client, db):
    await _pflicht(db, True)
    await _smtp_konfigurieren(db)
    await _gf(db)
    r = await client.post(
        "/api/v1/auth/gruppenfuehrer/login", data={"username": "mod", "password": "geheim123"}
    )
    assert r.status_code == 200
    body = r.json()
    assert body["access_token"] is None
    assert body["einrichtung_erforderlich"] is True
    assert body["email_gesetzt"] is True
    assert body["challenge"]


@pytest.mark.asyncio
async def test_login_pflicht_ohne_smtp_liefert_token_direkt(client, db):
    """Regression: ohne konfiguriertes SMTP käme ein Anmelde-Code nie an – die
    Pflicht-Einrichtung darf dann nicht erzwungen werden, sonst käme niemand
    (z. B. auf einer frisch eingerichteten Instanz) je in den Bereich, um SMTP
    überhaupt erst einzurichten."""
    await _pflicht(db, True)
    await _gf(db)  # SMTP bewusst NICHT konfiguriert (Default: leer)
    r = await client.post(
        "/api/v1/auth/gruppenfuehrer/login", data={"username": "mod", "password": "geheim123"}
    )
    assert r.status_code == 200
    body = r.json()
    assert body["access_token"]
    assert body["einrichtung_erforderlich"] is False


@pytest.mark.asyncio
async def test_einrichten_aktiviert_und_schliesst_login_ab(client, db):
    await _pflicht(db, True)
    m = await _gf(db)
    challenge = gruppenfuehrer_2fa_session.signiere_challenge(m.id)
    r = await client.post(
        "/api/v1/auth/gruppenfuehrer/2fa/einrichten", json={"challenge": challenge}
    )
    assert r.status_code == 200
    body = r.json()
    assert len(body["recovery_codes"]) > 0
    assert body["challenge"]
    await db.refresh(m)
    assert m.zwei_faktor_aktiv is True

    # Ein Recovery-Code aus der Einrichtung schließt den zweiten Schritt ab → Token.
    r2 = await client.post(
        "/api/v1/auth/gruppenfuehrer/2fa",
        json={"challenge": body["challenge"], "code": body["recovery_codes"][0]},
    )
    assert r2.status_code == 200
    assert r2.json()["access_token"]


@pytest.mark.asyncio
async def test_einrichten_ohne_email_400_dann_mit_email_ok(client, db):
    await _pflicht(db, True)
    m = await _gf(db, email=None)
    challenge = gruppenfuehrer_2fa_session.signiere_challenge(m.id)

    # Weder hinterlegte noch übergebene E-Mail → 400.
    r = await client.post(
        "/api/v1/auth/gruppenfuehrer/2fa/einrichten", json={"challenge": challenge}
    )
    assert r.status_code == 400

    # Mit übergebener E-Mail → aktiviert und speichert die Adresse.
    r2 = await client.post(
        "/api/v1/auth/gruppenfuehrer/2fa/einrichten",
        json={"challenge": challenge, "email": "neu@example.org"},
    )
    assert r2.status_code == 200
    await db.refresh(m)
    assert m.email == "neu@example.org"
    assert m.zwei_faktor_aktiv is True


@pytest.mark.asyncio
async def test_login_pflicht_aus_liefert_token_direkt(client, db):
    await _pflicht(db, False)
    await _gf(db)
    r = await client.post(
        "/api/v1/auth/gruppenfuehrer/login", data={"username": "mod", "password": "geheim123"}
    )
    assert r.status_code == 200
    assert r.json()["access_token"]
    assert r.json()["einrichtung_erforderlich"] is False


@pytest.mark.asyncio
async def test_login_mit_aktivem_2fa_unveraendert(client, db):
    await _pflicht(db, True)
    m = await _gf(db)
    m.zwei_faktor_aktiv = True
    await db.commit()
    r = await client.post(
        "/api/v1/auth/gruppenfuehrer/login", data={"username": "mod", "password": "geheim123"}
    )
    body = r.json()
    assert body["access_token"] is None
    assert body["zwei_faktor_erforderlich"] is True
    assert body["einrichtung_erforderlich"] is False
    assert body["challenge"]
