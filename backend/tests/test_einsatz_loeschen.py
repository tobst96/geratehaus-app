"""Tests für das Löschen von Einsätzen (Moderator/Admin, inkl. Cascade)."""

from datetime import datetime, timezone

import pytest
from sqlalchemy import select

from app.core.security import hash_secret
from app.models.einsatz import Einsatz, EinsatzPerson
from app.models.moderator import Moderator
from app.models.person import Person
from app.schemas.einsatz import EinsatzAnlegen
from app.services import einsatz_service


async def _admin_token(client, db):
    db.add(Moderator(username="admin", passwort_hash=hash_secret("geheim123"), rolle="admin"))
    await db.commit()
    login = await client.post(
        "/api/v1/auth/moderator/login", data={"username": "admin", "password": "geheim123"}
    )
    return login.json()["access_token"]


async def _einsatz_mit_teilnahme(db):
    einsatz = await einsatz_service.einsatz_anlegen(
        db, EinsatzAnlegen(titel="Testeinsatz", zeitpunkt=datetime(2026, 7, 1, 12, 0, tzinfo=timezone.utc))
    )
    person = Person(name="Teilnehmer Test")
    db.add(person)
    await db.commit()
    await db.refresh(person)
    db.add(EinsatzPerson(einsatz_id=einsatz.id, person_id=person.id))
    await db.commit()
    return einsatz


@pytest.mark.asyncio
async def test_einsatz_loeschen_entfernt_einsatz_und_teilnahmen(client, db):
    token = await _admin_token(client, db)
    h = {"Authorization": f"Bearer {token}"}
    einsatz = await _einsatz_mit_teilnahme(db)

    r = await client.delete(f"/api/v1/einsaetze/{einsatz.id}", headers=h)
    assert r.status_code == 204

    # Einsatz weg
    r = await client.get(f"/api/v1/einsaetze/{einsatz.id}", headers=h)
    assert r.status_code == 404
    # Teilnahmen per Cascade mit entfernt
    rest = (
        await db.execute(select(EinsatzPerson).where(EinsatzPerson.einsatz_id == einsatz.id))
    ).scalars().all()
    assert rest == []
    weg = (await db.execute(select(Einsatz).where(Einsatz.id == einsatz.id))).scalar_one_or_none()
    assert weg is None


@pytest.mark.asyncio
async def test_einsatz_loeschen_ohne_login_abgelehnt(client, db):
    einsatz = await _einsatz_mit_teilnahme(db)
    r = await client.delete(f"/api/v1/einsaetze/{einsatz.id}")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_einsatz_loeschen_unbekannt_404(client, db):
    token = await _admin_token(client, db)
    h = {"Authorization": f"Bearer {token}"}
    r = await client.delete("/api/v1/einsaetze/999999", headers=h)
    assert r.status_code == 404
