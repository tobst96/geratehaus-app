"""Tests für die „relevant"-Markierung von Dienstbüchern
(PATCH /dienstbuecher/{id}/relevant, Moderator)."""

from datetime import datetime, timezone

import pytest

from app.core.security import hash_secret
from app.models.moderator import Moderator
from app.schemas.dienstbuch import DienstbuchAnlegen
from app.services import dienstbuch_service


async def _moderator_token(client, db):
    db.add(Moderator(username="gf", passwort_hash=hash_secret("geheim123"), rolle="gruppenfuehrer"))
    await db.commit()
    login = await client.post(
        "/api/v1/auth/moderator/login", data={"username": "gf", "password": "geheim123"}
    )
    return login.json()["access_token"]


async def _dienstbuch(db):
    return await dienstbuch_service.dienstbuch_anlegen(
        db,
        DienstbuchAnlegen(titel="Übung", eroeffnet_am=datetime(2026, 7, 4, 18, 0, tzinfo=timezone.utc)),
    )


@pytest.mark.asyncio
async def test_relevant_setzen_und_zuruecksetzen(client, db):
    token = await _moderator_token(client, db)
    h = {"Authorization": f"Bearer {token}"}
    dienstbuch = await _dienstbuch(db)

    # Default: nicht relevant
    r = await client.get(f"/api/v1/dienstbuecher/{dienstbuch.id}")
    assert r.status_code == 200
    assert r.json()["relevant"] is False

    # Als relevant markieren
    r = await client.patch(
        f"/api/v1/dienstbuecher/{dienstbuch.id}/relevant", headers=h, json={"relevant": True}
    )
    assert r.status_code == 200
    assert r.json()["relevant"] is True

    # Persistiert – über einen frischen GET-Request (eigene Session) verifiziert
    r = await client.get(f"/api/v1/dienstbuecher/{dienstbuch.id}")
    assert r.json()["relevant"] is True

    # Wieder zurücksetzen
    r = await client.patch(
        f"/api/v1/dienstbuecher/{dienstbuch.id}/relevant", headers=h, json={"relevant": False}
    )
    assert r.status_code == 200
    assert r.json()["relevant"] is False


@pytest.mark.asyncio
async def test_relevant_ohne_login_abgelehnt(client, db):
    dienstbuch = await _dienstbuch(db)
    r = await client.patch(
        f"/api/v1/dienstbuecher/{dienstbuch.id}/relevant", json={"relevant": True}
    )
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_relevant_unbekanntes_dienstbuch_404(client, db):
    token = await _moderator_token(client, db)
    h = {"Authorization": f"Bearer {token}"}
    r = await client.patch("/api/v1/dienstbuecher/999999/relevant", headers=h, json={"relevant": True})
    assert r.status_code == 404
