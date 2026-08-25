"""Zugriffs-Tests für die Dienstbuch-Planer-Endpunkte: offen für ALLE
Gruppenführer (Nutzerentscheid 25.08.2026, keine granularen Einzelrechte),
Modul-Deaktivierung greift weiterhin."""

from app.core.security import hash_secret
from app.models.person import Person
from app.services.config_service import config_service


async def _token(client, db, name="gf", rolle="gruppenfuehrer"):
    db.add(Person(name=name, email=name, passwort_hash=hash_secret("geheim123"), gruppenfuehrer_rolle=rolle))
    await db.commit()
    login = await client.post(
        "/api/v1/auth/gruppenfuehrer/login", data={"username": name, "password": "geheim123"}
    )
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


async def test_gruppenfuehrer_darf_lesen_und_schreiben(client, db):
    h = await _token(client, db)

    lesen = await client.get("/api/v1/dienstbuch-planer/vorlagen", headers=h)
    assert lesen.status_code == 200

    schreiben = await client.post(
        "/api/v1/dienstbuch-planer/vorlagen",
        json={
            "titel": "Unterweisung UVV",
            "wiederholungstyp": "jaehrlich",
            "wochentag": 2,
            "kalenderwoche": 5,
            "kw_paritaet": "ungerade",
            "startdatum": "2020-01-01",
        },
        headers=h,
    )
    assert schreiben.status_code == 201


async def test_admin_darf_ebenfalls(client, db):
    h = await _token(client, db, name="admin", rolle="admin")
    resp = await client.get("/api/v1/dienstbuch-planer/vorlagen", headers=h)
    assert resp.status_code == 200


async def test_ohne_login_401(client):
    resp = await client.get("/api/v1/dienstbuch-planer/vorlagen")
    assert resp.status_code == 401


async def test_deaktiviertes_modul_liefert_404(client, db):
    await config_service.set(db, "modul_dienstbuch_planer_aktiv", False)
    h = await _token(client, db, name="admin", rolle="admin")
    resp = await client.get("/api/v1/dienstbuch-planer/vorlagen", headers=h)
    assert resp.status_code == 404


async def test_termin_manuell_anlegen_mit_uhrzeit(client, db):
    h = await _token(client, db)
    resp = await client.post(
        "/api/v1/dienstbuch-planer/termine",
        json={"titel": "Sondersitzung", "zieldatum": "2026-09-10", "uhrzeit": "19:30:00"},
        headers=h,
    )
    assert resp.status_code == 201
    daten = resp.json()
    assert daten["zieldatum"] == "2026-09-10"
    assert daten["uhrzeit"] == "19:30:00"
    assert daten["ist_platzhalter"] is False
    assert daten["status"] == "entwurf"


async def test_platzhalter_per_zieldatum_terminieren(client, db):
    """Drag&Drop-Fall: ein Platzhalter bekommt per PATCH ein Zieldatum und wird
    dadurch automatisch zum normalen Termin."""
    h = await _token(client, db)
    platzhalter = await client.post(
        "/api/v1/dienstbuch-planer/platzhalter",
        json={"titel": "Sommerfest", "jahr": 2026},
        headers=h,
    )
    assert platzhalter.status_code == 201
    termin_id = platzhalter.json()["id"]
    assert platzhalter.json()["ist_platzhalter"] is True

    aktualisiert = await client.patch(
        f"/api/v1/dienstbuch-planer/termine/{termin_id}",
        json={"zieldatum": "2026-07-18", "uhrzeit": "15:00:00"},
        headers=h,
    )
    assert aktualisiert.status_code == 200
    daten = aktualisiert.json()
    assert daten["ist_platzhalter"] is False
    assert daten["zieldatum"] == "2026-07-18"
    assert daten["uhrzeit"] == "15:00:00"
