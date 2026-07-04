"""Tests für das Formular-Modul: CRUD, Einreichungsvalidierung, Mailversand,
Zugriff (Login-Pflicht / Modul inaktiv) und Moderator-Sichtbarkeit."""

import pytest

from app.core.security import hash_secret
from app.models.moderator import Moderator
from app.models.person import Person
from app.services import formular_service
from app.services.config_service import config_service
from app.schemas.formular import FormularCreate, FormularFeldCreate, FormularUpdate


async def _token(client, db, rolle="admin", username=None):
    username = username or rolle
    db.add(Moderator(username=username, passwort_hash=hash_secret("geheim123"), rolle=rolle))
    await db.commit()
    login = await client.post(
        "/api/v1/auth/moderator/login", data={"username": username, "password": "geheim123"}
    )
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


async def _formular(db, **kwargs):
    daten = {"name": "Testformular", "aktiv": True, **kwargs}
    return await formular_service.formular_anlegen(db, FormularCreate(**daten))


async def _feld(db, formular_id, **kwargs):
    daten = {"label": "Feld", **kwargs}
    return await formular_service.feld_anlegen(db, formular_id, FormularFeldCreate(**daten))


# --- Admin-CRUD --------------------------------------------------------------


@pytest.mark.asyncio
async def test_admin_crud_formular_und_feld(client, db):
    h = await _token(client, db)
    r = await client.post("/api/v1/moderator/formulare", json={"name": "Rückmeldung"}, headers=h)
    assert r.status_code == 201
    fid = r.json()["id"]

    r = await client.post(
        f"/api/v1/moderator/formulare/{fid}/felder",
        json={"label": "Bewertung", "typ": "sterne", "max_sterne": 5, "pflicht": True},
        headers=h,
    )
    assert r.status_code == 201

    r = await client.get(f"/api/v1/moderator/formulare/{fid}", headers=h)
    assert r.status_code == 200
    assert len(r.json()["felder"]) == 1

    r = await client.put(
        f"/api/v1/moderator/formulare/{fid}", json={"aktiv": True, "moderator_sichtbar": True}, headers=h
    )
    assert r.status_code == 200 and r.json()["aktiv"] is True


@pytest.mark.asyncio
async def test_ungueltiger_feldtyp_abgelehnt(client, db):
    h = await _token(client, db)
    r = await client.post("/api/v1/moderator/formulare", json={"name": "F"}, headers=h)
    fid = r.json()["id"]
    r = await client.post(
        f"/api/v1/moderator/formulare/{fid}/felder", json={"label": "X", "typ": "quatsch"}, headers=h
    )
    assert r.status_code == 422


# --- Öffentliche Einreichung + Validierung -----------------------------------


@pytest.mark.asyncio
async def test_einreichung_validierung_und_mail(client, db, monkeypatch):
    gesendet = []

    async def fake_send_an(self, _db, empfaenger, betreff, nachricht):
        gesendet.append((empfaenger, betreff, nachricht))

    monkeypatch.setattr(formular_service.EmailNotifier, "send_an", fake_send_an)
    await config_service.set(db, "notifier_email_aktiv", True)

    formular = await _formular(db, email_empfaenger="chef@wehr.de")
    pflicht = await _feld(db, formular.id, label="Name", typ="text", pflicht=True)
    sterne = await _feld(db, formular.id, label="Bewertung", typ="sterne", max_sterne=5)
    dd = await _feld(db, formular.id, label="Grund", typ="dropdown", optionen=["A", "B"])

    # Pflichtfeld fehlt -> 422 mit Feldbezug
    r = await client.post(f"/api/v1/formulare/{formular.id}/einreichen", json={"antworten": {}})
    assert r.status_code == 422
    assert str(pflicht.id) in r.json()["detail"]["felder"]

    # Sterne außerhalb 1..max -> 422
    r = await client.post(
        f"/api/v1/formulare/{formular.id}/einreichen",
        json={"antworten": {str(pflicht.id): "Max", str(sterne.id): 9}},
    )
    assert r.status_code == 422

    # Dropdown-Wert nicht in Optionen -> 422
    r = await client.post(
        f"/api/v1/formulare/{formular.id}/einreichen",
        json={"antworten": {str(pflicht.id): "Max", str(dd.id): "C"}},
    )
    assert r.status_code == 422

    # Gültige Einreichung -> 201, Mail an Empfänger, Snapshot gespeichert
    r = await client.post(
        f"/api/v1/formulare/{formular.id}/einreichen",
        json={"antworten": {str(pflicht.id): "Max", str(sterne.id): 4, str(dd.id): "B"}},
    )
    assert r.status_code == 201
    assert len(gesendet) == 1 and gesendet[0][0] == "chef@wehr.de"

    einreichungen = await formular_service.einreichungen_fuer(db, formular.id)
    assert len(einreichungen) == 1
    werte = {a["label"]: a["wert"] for a in einreichungen[0].antworten}
    assert werte["Name"] == "Max" and werte["Bewertung"] == 4 and werte["Grund"] == "B"


@pytest.mark.asyncio
async def test_login_erforderlich_ohne_anmeldung_401(client, db):
    formular = await _formular(db, login_erforderlich=True)
    await _feld(db, formular.id, label="Text", typ="text")
    r = await client.post(f"/api/v1/formulare/{formular.id}/einreichen", json={"antworten": {}})
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_modul_inaktiv_404(client, db):
    await config_service.set(db, "modul_formular_aktiv", False)
    formular = await _formular(db)
    r = await client.get(f"/api/v1/formulare/{formular.id}")
    assert r.status_code == 404


# --- Moderator-Sichtbarkeit --------------------------------------------------


@pytest.mark.asyncio
async def test_moderator_sichtbarkeit(client, db):
    formular = await _formular(db, moderator_sichtbar=False)
    h_mod = await _token(client, db, rolle="gruppenfuehrer", username="gf")

    r = await client.get(f"/api/v1/moderator/formulare/{formular.id}/einreichungen", headers=h_mod)
    assert r.status_code == 403

    # Freigeben -> Moderator darf sehen
    await formular_service.formular_aktualisieren(
        db, formular, FormularUpdate(moderator_sichtbar=True)
    )
    r = await client.get(f"/api/v1/moderator/formulare/{formular.id}/einreichungen", headers=h_mod)
    assert r.status_code == 200

    # "sichtbar"-Liste zeigt dem Gruppenführer nur freigegebene Formulare
    r = await client.get("/api/v1/moderator/formulare/sichtbar", headers=h_mod)
    assert r.status_code == 200 and [f["id"] for f in r.json()] == [formular.id]
