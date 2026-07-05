"""Tests für das Audit-Log (Etappe P5, Phase 1): sicherheitsrelevante Aktionen
werden mit Akteur protokolliert, sind nur für Admins abrufbar, filter-/sortierbar."""

import pytest

from app.core.security import hash_secret
from app.models.moderator import Moderator
from app.models.person import Person
from app.services import audit_service, modul_service


async def _token(client, db, username="admin", rolle="admin"):
    db.add(Moderator(username=username, passwort_hash=hash_secret("geheim123"), rolle=rolle))
    await db.commit()
    r = await client.post(
        "/api/v1/auth/moderator/login", data={"username": username, "password": "geheim123"}
    )
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.mark.asyncio
async def test_person_loeschen_wird_protokolliert(client, db):
    h = await _token(client, db)
    p = Person(name="Zu Löschen")
    db.add(p)
    await db.commit()
    await db.refresh(p)

    r = await client.delete(f"/api/v1/moderator/stammdaten/personen/{p.id}", headers=h)
    assert r.status_code == 204

    eintraege = await audit_service.liste(db)
    assert any(
        e.aktion == "person_geloescht" and e.details == "Zu Löschen" and e.akteur == "admin"
        for e in eintraege
    )


@pytest.mark.asyncio
async def test_berechtigung_setzen_wird_protokolliert(client, db):
    await modul_service.ensure_module(db)
    h = await _token(client, db)
    gf = Moderator(username="gf", passwort_hash=hash_secret("x"), rolle="gruppenfuehrer")
    db.add(gf)
    await db.commit()
    await db.refresh(gf)

    r = await client.put(
        f"/api/v1/moderator/berechtigungen/{gf.id}/einstellungen",
        json={"erlaubt": True},
        headers=h,
    )
    assert r.status_code == 204

    eintraege = await audit_service.liste(db, aktion="berechtigung_geaendert")
    assert len(eintraege) == 1
    assert eintraege[0].objekt_id == gf.id
    assert "einstellungen" in eintraege[0].details


@pytest.mark.asyncio
async def test_audit_endpunkt_nur_admin(client, db):
    admin_h = await _token(client, db)
    await audit_service.protokolliere(db, "admin", "test_aktion", "test", 1, "x")

    r = await client.get("/api/v1/moderator/audit", headers=admin_h)
    assert r.status_code == 200
    assert any(e["aktion"] == "test_aktion" for e in r.json())

    gf_h = await _token(client, db, username="gf2", rolle="gruppenfuehrer")
    r = await client.get("/api/v1/moderator/audit", headers=gf_h)
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_moderator_anlegen_wird_protokolliert(client, db):
    h = await _token(client, db)
    r = await client.post(
        "/api/v1/moderator/einstellungen/moderatoren",
        json={"username": "neuer_gf", "passwort": "geheim123", "rolle": "gruppenfuehrer"},
        headers=h,
    )
    assert r.status_code == 201

    eintraege = await audit_service.liste(db, aktion="moderator_angelegt")
    assert len(eintraege) == 1
    assert eintraege[0].akteur == "admin"
    assert "neuer_gf" in eintraege[0].details


@pytest.mark.asyncio
async def test_moderator_passwort_aendern_wird_protokolliert(client, db):
    h = await _token(client, db)
    ziel = Moderator(username="ziel", passwort_hash=hash_secret("alt12345"), rolle="gruppenfuehrer")
    db.add(ziel)
    await db.commit()
    await db.refresh(ziel)

    r = await client.put(
        f"/api/v1/moderator/einstellungen/moderatoren/{ziel.id}/passwort",
        json={"passwort": "neu12345"},
        headers=h,
    )
    assert r.status_code == 200

    eintraege = await audit_service.liste(db, aktion="moderator_passwort_geaendert")
    assert len(eintraege) == 1
    assert eintraege[0].objekt_id == ziel.id
    assert eintraege[0].details == "ziel"


@pytest.mark.asyncio
async def test_moderator_loeschen_wird_protokolliert(client, db):
    h = await _token(client, db)
    ziel = Moderator(username="wegzu", passwort_hash=hash_secret("x12345678"), rolle="gruppenfuehrer")
    db.add(ziel)
    await db.commit()
    await db.refresh(ziel)

    r = await client.delete(
        f"/api/v1/moderator/einstellungen/moderatoren/{ziel.id}", headers=h
    )
    assert r.status_code == 204

    eintraege = await audit_service.liste(db, aktion="moderator_geloescht")
    assert len(eintraege) == 1
    assert eintraege[0].details == "wegzu"


@pytest.mark.asyncio
async def test_modul_flag_aenderung_wird_protokolliert(client, db):
    h = await _token(client, db)
    r = await client.patch(
        "/api/v1/moderator/feature-module/einsatztagebuch",
        json={"aktiv": True},
        headers=h,
    )
    assert r.status_code == 200

    eintraege = await audit_service.liste(db, aktion="modul_flag_geaendert")
    assert len(eintraege) == 1
    assert "einsatztagebuch" in eintraege[0].details
    assert "aktiv=True" in eintraege[0].details


@pytest.mark.asyncio
async def test_liste_filtert_und_sortiert_neueste_zuerst(db):
    await audit_service.protokolliere(db, "a", "aktion_x", "t", 1)
    await audit_service.protokolliere(db, "a", "aktion_y", "t", 2)
    await audit_service.protokolliere(db, "a", "aktion_x", "t", 3)

    nur_x = await audit_service.liste(db, aktion="aktion_x")
    assert len(nur_x) == 2 and all(e.aktion == "aktion_x" for e in nur_x)

    alle = await audit_service.liste(db)
    assert alle[0].objekt_id == 3  # neuester Eintrag zuerst
