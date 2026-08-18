"""Tests für das Audit-Log (Etappe P5, Phase 1): sicherheitsrelevante Aktionen
werden mit Akteur protokolliert, sind nur für Admins abrufbar, filter-/sortierbar."""

from datetime import datetime, timedelta, timezone

import pytest

from app.core.security import hash_secret
from app.models.audit_log import AuditLog
from app.models.person import Person
from app.services import audit_service, modul_service
from app.services.config_service import config_service


async def _token(client, db, username="admin", rolle="admin"):
    db.add(Person(name=username, email=username, passwort_hash=hash_secret("geheim123"), gruppenfuehrer_rolle=rolle))
    await db.commit()
    r = await client.post(
        "/api/v1/auth/gruppenfuehrer/login", data={"username": username, "password": "geheim123"}
    )
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.mark.asyncio
async def test_person_loeschen_wird_protokolliert(client, db):
    h = await _token(client, db)
    p = Person(name="Zu Löschen")
    db.add(p)
    await db.commit()
    await db.refresh(p)

    r = await client.delete(f"/api/v1/gruppenfuehrer/stammdaten/personen/{p.id}", headers=h)
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
    gf = Person(name="gf", email="gf", passwort_hash=hash_secret("x"), gruppenfuehrer_rolle="gruppenfuehrer")
    db.add(gf)
    await db.commit()
    await db.refresh(gf)

    r = await client.put(
        f"/api/v1/gruppenfuehrer/berechtigungen/{gf.id}/einstellungen",
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

    r = await client.get("/api/v1/gruppenfuehrer/audit", headers=admin_h)
    assert r.status_code == 200
    assert any(e["aktion"] == "test_aktion" for e in r.json())

    gf_h = await _token(client, db, username="gf2", rolle="gruppenfuehrer")
    r = await client.get("/api/v1/gruppenfuehrer/audit", headers=gf_h)
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_person_elevieren_wird_protokolliert(client, db):
    h = await _token(client, db)
    ziel = Person(name="neuer_gf", email="neuer_gf@example.org")
    db.add(ziel)
    await db.commit()
    await db.refresh(ziel)

    r = await client.put(
        f"/api/v1/gruppenfuehrer/stammdaten/personen/{ziel.id}/elevation",
        json={"rolle": "gruppenfuehrer", "passwort": "geheim123"},
        headers=h,
    )
    assert r.status_code == 200

    eintraege = await audit_service.liste(db, aktion="person_eleviert")
    assert len(eintraege) == 1
    assert eintraege[0].akteur == "admin"
    assert eintraege[0].objekt_id == ziel.id


@pytest.mark.asyncio
async def test_person_passwort_setzen_wird_protokolliert(client, db):
    h = await _token(client, db)
    ziel = Person(name="ziel", email="ziel", passwort_hash=hash_secret("alt12345"), gruppenfuehrer_rolle="gruppenfuehrer")
    db.add(ziel)
    await db.commit()
    await db.refresh(ziel)

    r = await client.put(
        f"/api/v1/gruppenfuehrer/stammdaten/personen/{ziel.id}/passwort-setzen",
        json={"passwort": "neu12345"},
        headers=h,
    )
    assert r.status_code == 204

    eintraege = await audit_service.liste(db, aktion="person_passwort_gesetzt")
    assert len(eintraege) == 1
    assert eintraege[0].objekt_id == ziel.id


@pytest.mark.asyncio
async def test_person_de_elevieren_wird_protokolliert(client, db):
    h = await _token(client, db)
    ziel = Person(name="wegzu", email="wegzu", passwort_hash=hash_secret("x12345678"), gruppenfuehrer_rolle="gruppenfuehrer")
    db.add(ziel)
    await db.commit()
    await db.refresh(ziel)

    r = await client.delete(
        f"/api/v1/gruppenfuehrer/stammdaten/personen/{ziel.id}/elevation", headers=h
    )
    assert r.status_code == 204

    eintraege = await audit_service.liste(db, aktion="person_de_eleviert")
    assert len(eintraege) == 1
    assert eintraege[0].objekt_id == ziel.id


@pytest.mark.asyncio
async def test_modul_flag_aenderung_wird_protokolliert(client, db):
    h = await _token(client, db)
    r = await client.patch(
        "/api/v1/gruppenfuehrer/feature-module/einsatztagebuch",
        json={"aktiv": True},
        headers=h,
    )
    assert r.status_code == 200

    eintraege = await audit_service.liste(db, aktion="modul_flag_geaendert")
    assert len(eintraege) == 1
    assert "einsatztagebuch" in eintraege[0].details
    assert "aktiv=True" in eintraege[0].details


@pytest.mark.asyncio
async def test_export_csv_und_json(client, db):
    admin_h = await _token(client, db)
    await audit_service.protokolliere(db, "admin", "person_geloescht", "person", 7, "Max Muster")

    r_csv = await client.get("/api/v1/gruppenfuehrer/audit/export?format=csv", headers=admin_h)
    assert r_csv.status_code == 200
    assert "text/csv" in r_csv.headers["content-type"]
    assert "attachment" in r_csv.headers["content-disposition"]
    assert "person_geloescht" in r_csv.text
    assert "Max Muster" in r_csv.text

    r_json = await client.get("/api/v1/gruppenfuehrer/audit/export?format=json", headers=admin_h)
    assert r_json.status_code == 200
    daten = r_json.json()
    assert any(e["aktion"] == "person_geloescht" and e["objekt_id"] == 7 for e in daten)

    r_bad = await client.get("/api/v1/gruppenfuehrer/audit/export?format=xml", headers=admin_h)
    assert r_bad.status_code == 400


@pytest.mark.asyncio
async def test_export_nur_admin(client, db):
    gf_h = await _token(client, db, username="gf_export", rolle="gruppenfuehrer")
    r = await client.get("/api/v1/gruppenfuehrer/audit/export", headers=gf_h)
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_aufbewahrung_bereinigt_alte_eintraege(db):
    # Ein alter (>365 Tage) und ein frischer Eintrag.
    alt = AuditLog(
        akteur="a", aktion="alt", objekt_typ="t",
        zeitpunkt=datetime.now(timezone.utc) - timedelta(days=400),
    )
    db.add(alt)
    await audit_service.protokolliere(db, "a", "frisch", "t", 1)
    await db.commit()

    geloescht = await audit_service.aufbewahrung_bereinigen(db)
    assert geloescht == 1

    verbleibend = await audit_service.liste(db)
    assert [e.aktion for e in verbleibend] == ["frisch"]


@pytest.mark.asyncio
async def test_aufbewahrung_deaktiviert_bei_null(db):
    await config_service.set(db, "audit_aufbewahrung_tage", 0)
    alt = AuditLog(
        akteur="a", aktion="alt", objekt_typ="t",
        zeitpunkt=datetime.now(timezone.utc) - timedelta(days=1000),
    )
    db.add(alt)
    await db.commit()

    assert await audit_service.aufbewahrung_bereinigen(db) == 0
    assert len(await audit_service.liste(db)) == 1


@pytest.mark.asyncio
async def test_liste_filtert_und_sortiert_neueste_zuerst(db):
    await audit_service.protokolliere(db, "a", "aktion_x", "t", 1)
    await audit_service.protokolliere(db, "a", "aktion_y", "t", 2)
    await audit_service.protokolliere(db, "a", "aktion_x", "t", 3)

    nur_x = await audit_service.liste(db, aktion="aktion_x")
    assert len(nur_x) == 2 and all(e.aktion == "aktion_x" for e in nur_x)

    alle = await audit_service.liste(db)
    assert alle[0].objekt_id == 3  # neuester Eintrag zuerst
