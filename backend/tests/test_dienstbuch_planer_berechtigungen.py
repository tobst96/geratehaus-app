"""Berechtigungs-Tests für die Dienstbuch-Planer-Endpunkte: getrennte
"ansehen"/"bearbeiten"-Rechte, Modul-Deaktivierung (Backlog: Modul
Dienstbuch Planer, Phase 1)."""

from app.core.security import hash_secret
from app.models.person import Person
from app.services import berechtigungs_service, modul_service
from app.services.config_service import config_service


async def _gruppenfuehrer_token(client, db, name="gf", rechte: list[str] | None = None):
    await modul_service.ensure_module(db)
    person = Person(
        name=name, email=name, passwort_hash=hash_secret("geheim123"), gruppenfuehrer_rolle="gruppenfuehrer"
    )
    db.add(person)
    await db.commit()
    await db.refresh(person)
    for recht in rechte or []:
        await berechtigungs_service.set_berechtigung(db, person.id, recht, True)
    login = await client.post(
        "/api/v1/auth/gruppenfuehrer/login", data={"username": name, "password": "geheim123"}
    )
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


async def _admin_token(client, db, name="admin"):
    db.add(Person(name=name, email=name, passwort_hash=hash_secret("geheim123"), gruppenfuehrer_rolle="admin"))
    await db.commit()
    login = await client.post(
        "/api/v1/auth/gruppenfuehrer/login", data={"username": name, "password": "geheim123"}
    )
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


async def test_nur_ansehen_darf_lesen_aber_nicht_schreiben(client, db):
    h = await _gruppenfuehrer_token(client, db, rechte=["dienstbuch-planer-ansehen"])

    lesen = await client.get("/api/v1/dienstbuch-planer/vorlagen", headers=h)
    assert lesen.status_code == 200

    schreiben = await client.post(
        "/api/v1/dienstbuch-planer/vorlagen",
        json={
            "titel": "Test",
            "wiederholungstyp": "jaehrlich",
            "wochentag": 2,
            "kalenderwoche": 5,
            "kw_paritaet": "ungerade",
            "startdatum": "2020-01-01",
        },
        headers=h,
    )
    assert schreiben.status_code == 403


async def test_nur_bearbeiten_ohne_ansehen_darf_nicht_lesen(client, db):
    h = await _gruppenfuehrer_token(client, db, rechte=["dienstbuch-planer-bearbeiten"])
    lesen = await client.get("/api/v1/dienstbuch-planer/vorlagen", headers=h)
    assert lesen.status_code == 403


async def test_bearbeiten_recht_erlaubt_vorlage_anlegen(client, db):
    h = await _gruppenfuehrer_token(
        client, db, rechte=["dienstbuch-planer-ansehen", "dienstbuch-planer-bearbeiten"]
    )
    resp = await client.post(
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
    assert resp.status_code == 201
    assert resp.json()["titel"] == "Unterweisung UVV"


async def test_admin_hat_immer_vollzugriff_per_bypass(client, db):
    h = await _admin_token(client, db)
    resp = await client.get("/api/v1/dienstbuch-planer/vorlagen", headers=h)
    assert resp.status_code == 200


async def test_ohne_login_401(client):
    resp = await client.get("/api/v1/dienstbuch-planer/vorlagen")
    assert resp.status_code == 401


async def test_deaktiviertes_modul_liefert_404(client, db):
    await config_service.set(db, "modul_dienstbuch_planer_aktiv", False)
    h = await _admin_token(client, db)
    resp = await client.get("/api/v1/dienstbuch-planer/vorlagen", headers=h)
    assert resp.status_code == 404
