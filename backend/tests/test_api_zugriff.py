"""Tests für das Zugriffs-Gate (require_zugriff): die sonst öffentlichen Daten-
Endpunkte sind ohne Identität gesperrt (401) und mit Kiosk-Token / Moderator /
Mitglieds-Cookie erreichbar."""

from datetime import datetime, timezone

import pytest

from app.core import mitglied_session
from app.core.security import hash_secret
from app.models.kiosk_token import KioskToken
from app.models.moderator import Moderator
from app.schemas.einsatz import EinsatzAnlegen
from app.services import einsatz_service

GESCHUETZT = [
    "/api/v1/einsaetze",
    "/api/v1/dienstbuecher/letzte",
    "/api/v1/buchungen",
    "/api/v1/stammdaten/gruppen",
]


async def _kiosk_token(db) -> str:
    kt = KioskToken(bezeichnung="Testkiosk", token="kiosk-test-token")
    db.add(kt)
    await db.commit()
    return kt.token


async def _moderator_header(client, db) -> dict:
    db.add(Moderator(username="gf", passwort_hash=hash_secret("geheim123"), rolle="gruppenfuehrer"))
    await db.commit()
    login = await client.post(
        "/api/v1/auth/moderator/login", data={"username": "gf", "password": "geheim123"}
    )
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


@pytest.mark.asyncio
async def test_ohne_identitaet_gesperrt(client, db):
    for pfad in GESCHUETZT:
        r = await client.get(pfad)
        assert r.status_code == 401, f"{pfad} sollte ohne Identität 401 liefern"


@pytest.mark.asyncio
async def test_mit_kiosk_token_erlaubt(client, db):
    token = await _kiosk_token(db)
    h = {"X-Kiosk-Token": token}
    for pfad in GESCHUETZT:
        r = await client.get(pfad, headers=h)
        assert r.status_code == 200, f"{pfad} mit Kiosk-Token sollte 200 sein"

    # Ungültiger Kiosk-Token zählt nicht als Identität
    r = await client.get("/api/v1/einsaetze", headers={"X-Kiosk-Token": "falsch"})
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_mit_moderator_erlaubt(client, db):
    h = await _moderator_header(client, db)
    for pfad in GESCHUETZT:
        r = await client.get(pfad, headers=h)
        assert r.status_code == 200


@pytest.mark.asyncio
async def test_mit_mitglieds_cookie_erlaubt(client, db):
    # Nur ein SIGNIERTES Namens-Cookie zählt als Identität.
    signiert = mitglied_session.signiere_name("Max Muster")
    h = {"Cookie": f"geraetehaus_name={signiert}"}
    for pfad in GESCHUETZT:
        r = await client.get(pfad, headers=h)
        assert r.status_code == 200


@pytest.mark.asyncio
async def test_gefaelschtes_mitglieds_cookie_gesperrt(client, db):
    # Klartext-Name (nicht signiert) ist gefälscht → 401 (Regression fürs
    # geschlossene Auth-Loch).
    h = {"Cookie": "geraetehaus_name=Max Muster"}
    r = await client.get("/api/v1/einsaetze", headers=h)
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_zusatzfelder_write_ohne_identitaet_gesperrt(client, db):
    """Regression: der frühere öffentliche Schreibzugriff auf Einsatz-Zusatzfelder
    ist jetzt gesperrt."""
    einsatz = await einsatz_service.einsatz_anlegen(
        db, EinsatzAnlegen(titel="X", zeitpunkt=datetime(2026, 7, 5, 12, tzinfo=timezone.utc))
    )
    r = await client.patch(
        f"/api/v1/einsaetze/{einsatz.id}/zusatzfelder", json={"zusatzfelder": {"a": "b"}}
    )
    assert r.status_code == 401
