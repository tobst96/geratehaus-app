"""CSV-Import für Personen: legt Zeilen über person_anlegen an, löst Gruppe/
Funktion per Name auf, sammelt Fehler pro Zeile statt abzubrechen. Endpunkt ist
admin-/`personal`-geschützt (Bypass), Vorlage steht zum Download bereit."""

import pytest

from app.core.security import hash_secret
from app.models.funktion import FunktionDienststunden
from app.models.gruppe import Gruppe
from app.models.person import Person
from app.services import modul_service


async def _admin(client, db):
    m = Person(name="admin", email="admin", passwort_hash=hash_secret("geheim123"), gruppenfuehrer_rolle="admin")
    db.add(m)
    await db.commit()
    r = await client.post(
        "/api/v1/auth/gruppenfuehrer/login", data={"username": "admin", "password": "geheim123"}
    )
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def _upload(inhalt: str):
    return {"datei": ("personen.csv", inhalt.encode("utf-8"), "text/csv")}


@pytest.mark.asyncio
async def test_csv_import_legt_personen_an(client, db):
    await modul_service.ensure_module(db)
    h = await _admin(client, db)
    db.add_all([Gruppe(name="1. Zug"), FunktionDienststunden(name="Truppmann")])
    await db.commit()

    csv = (
        "vorname;zwischenname;nachname;email;gruppe;funktion\n"
        "Max;;Mustermann;max@example.org;1. Zug;Truppmann\n"
        "Erika;von;Musterfrau;;;\n"
    )
    r = await client.post(
        "/api/v1/gruppenfuehrer/stammdaten/personen/csv-import", files=_upload(csv), headers=h
    )
    assert r.status_code == 200
    assert r.json() == {"angelegt": 2, "fehler": []}

    liste = (await client.get("/api/v1/gruppenfuehrer/stammdaten/personen", headers=h)).json()
    namen = {p["name"] for p in liste}
    assert "Max Mustermann" in namen
    assert any("Musterfrau" in n for n in namen)


@pytest.mark.asyncio
async def test_csv_import_sammelt_fehler_pro_zeile(client, db):
    await modul_service.ensure_module(db)
    h = await _admin(client, db)

    # Zeile 2: gültig. Zeile 3: fehlender Nachname. Zeile 4: unbekannte Gruppe.
    csv = (
        "vorname;zwischenname;nachname;email;gruppe;funktion\n"
        "Max;;Mustermann;;;\n"
        "Ohne;;;;;\n"
        "Gruppe;;Fehlt;;Existiert nicht;\n"
    )
    r = await client.post(
        "/api/v1/gruppenfuehrer/stammdaten/personen/csv-import", files=_upload(csv), headers=h
    )
    assert r.status_code == 200
    daten = r.json()
    assert daten["angelegt"] == 1
    zeilen = {f["zeile"] for f in daten["fehler"]}
    assert zeilen == {3, 4}


@pytest.mark.asyncio
async def test_csv_import_komma_getrennt(client, db):
    await modul_service.ensure_module(db)
    h = await _admin(client, db)
    csv = "vorname,zwischenname,nachname,email,gruppe,funktion\nAnna,,Beispiel,,,\n"
    r = await client.post(
        "/api/v1/gruppenfuehrer/stammdaten/personen/csv-import", files=_upload(csv), headers=h
    )
    assert r.status_code == 200
    assert r.json()["angelegt"] == 1


@pytest.mark.asyncio
async def test_csv_import_gf_ohne_personal_403(client, db):
    await modul_service.ensure_module(db)
    m = Person(name="gf", email="gf", passwort_hash=hash_secret("geheim123"), gruppenfuehrer_rolle="gruppenfuehrer")
    db.add(m)
    await db.commit()
    r = await client.post(
        "/api/v1/auth/gruppenfuehrer/login", data={"username": "gf", "password": "geheim123"}
    )
    h = {"Authorization": f"Bearer {r.json()['access_token']}"}
    csv = "vorname;zwischenname;nachname;email;gruppe;funktion\nMax;;Mustermann;;;\n"
    r = await client.post(
        "/api/v1/gruppenfuehrer/stammdaten/personen/csv-import", files=_upload(csv), headers=h
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_csv_vorlage_download(client, db):
    await modul_service.ensure_module(db)
    h = await _admin(client, db)
    r = await client.get("/api/v1/gruppenfuehrer/stammdaten/personen/csv-vorlage", headers=h)
    assert r.status_code == 200
    assert "vorname" in r.text
    assert "attachment" in r.headers["content-disposition"]
