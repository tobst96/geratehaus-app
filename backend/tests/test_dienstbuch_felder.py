"""Konfigurierbare Zusatzfelder für Dienstbücher (analog Einsatz-Felder):
Feld-CRUD (admin/`stammdaten`), Typ „auswahl" mit Optionen, Werte pro Dienstbuch
über Anlegen + PATCH /zusatzfelder, öffentliche Feld-Definitionen fürs Formular."""

from datetime import datetime, timezone

import pytest

from app.core.security import hash_secret
from app.models.person import Person
from app.services import modul_service


async def _token(client, db, username="admin", rolle="admin"):
    db.add(Person(name=username, passwort_hash=hash_secret("geheim123"), gruppenfuehrer_rolle=rolle))
    await db.commit()
    r = await client.post(
        "/api/v1/auth/gruppenfuehrer/login", data={"username": username, "password": "geheim123"}
    )
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.mark.asyncio
async def test_feld_crud_und_auswahl_optionen(client, db):
    await modul_service.ensure_module(db)
    h = await _token(client, db)

    # Anlegen: Textfeld
    r = await client.post(
        "/api/v1/gruppenfuehrer/stammdaten/dienstbuch-felder",
        json={"label": "Ausbildungsthema", "typ": "text"},
        headers=h,
    )
    assert r.status_code == 201
    assert r.json()["schluessel"] == "ausbildungsthema"
    assert r.json()["optionen"] == []

    # Anlegen: Auswahl mit Optionen
    r = await client.post(
        "/api/v1/gruppenfuehrer/stammdaten/dienstbuch-felder",
        json={"label": "Art", "typ": "auswahl", "optionen": ["Übung", " Unterricht ", ""]},
        headers=h,
    )
    assert r.status_code == 201
    auswahl = r.json()
    assert auswahl["typ"] == "auswahl"
    assert auswahl["optionen"] == ["Übung", "Unterricht"]  # getrimmt, Leereinträge raus

    # Update auf anderen Typ leert Optionen
    r = await client.put(
        f"/api/v1/gruppenfuehrer/stammdaten/dienstbuch-felder/{auswahl['id']}",
        json={"typ": "text"},
        headers=h,
    )
    assert r.status_code == 200
    assert r.json()["optionen"] == []

    # Liste (inkl. inaktive) enthält beide
    r = await client.get("/api/v1/gruppenfuehrer/stammdaten/dienstbuch-felder", headers=h)
    assert len(r.json()) == 2


@pytest.mark.asyncio
async def test_ungueltiger_typ_400(client, db):
    await modul_service.ensure_module(db)
    h = await _token(client, db)
    r = await client.post(
        "/api/v1/gruppenfuehrer/stammdaten/dienstbuch-felder",
        json={"label": "X", "typ": "quatsch"},
        headers=h,
    )
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_gf_ohne_stammdaten_recht_403(client, db):
    await modul_service.ensure_module(db)
    h = await _token(client, db, "gf", "gruppenfuehrer")
    r = await client.post(
        "/api/v1/gruppenfuehrer/stammdaten/dienstbuch-felder",
        json={"label": "X", "typ": "text"},
        headers=h,
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_zusatzfelder_beim_anlegen_und_patch(client, db):
    await modul_service.ensure_module(db)
    h = await _token(client, db)

    # Feld anlegen, damit die öffentliche Definitionsliste etwas liefert
    await client.post(
        "/api/v1/gruppenfuehrer/stammdaten/dienstbuch-felder",
        json={"label": "Ausbildungsthema", "typ": "text"},
        headers=h,
    )

    # Öffentliche (gegatete) Definitionsliste fürs Formular
    r = await client.get("/api/v1/dienstbuecher/feld-definitionen", headers=h)
    assert r.status_code == 200
    assert [f["schluessel"] for f in r.json()] == ["ausbildungsthema"]

    # Dienstbuch mit Zusatzfeldwert anlegen
    r = await client.post(
        "/api/v1/dienstbuecher",
        json={
            "titel": "Übungsdienst",
            "eroeffnet_am": datetime(2026, 7, 4, 18, 0, tzinfo=timezone.utc).isoformat(),
            "zusatzfelder": {"ausbildungsthema": "Leiterngruppe"},
        },
        headers=h,
    )
    assert r.status_code == 201
    db_id = r.json()["id"]
    assert r.json()["zusatzfelder"]["ausbildungsthema"] == "Leiterngruppe"

    # Wert per PATCH ändern
    r = await client.patch(
        f"/api/v1/dienstbuecher/{db_id}/zusatzfelder",
        json={"zusatzfelder": {"ausbildungsthema": "Knoten & Stiche"}},
        headers=h,
    )
    assert r.status_code == 200
    assert r.json()["zusatzfelder"]["ausbildungsthema"] == "Knoten & Stiche"

    # Persistiert
    r = await client.get(f"/api/v1/dienstbuecher/{db_id}", headers=h)
    assert r.json()["zusatzfelder"]["ausbildungsthema"] == "Knoten & Stiche"
