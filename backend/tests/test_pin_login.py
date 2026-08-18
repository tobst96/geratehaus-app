"""Tests für den Namen+PIN-Login (Barcode-Modul AUS): Personenauswahl,
Login mit PIN, PIN-Self-Service, Gruppenführer-Freigabe und Erinnerungs-Job."""

import pytest

from app.models.person import Person
from app.services import feature_modul_service, pin_service, stammdaten_service
from app.services.config_service import config_service


@pytest.fixture(autouse=True)
def _fake_smtp(monkeypatch):
    gesendet = []

    async def fake_send(message, **kwargs):
        gesendet.append(message)

    monkeypatch.setattr("app.services.notifier.email.aiosmtplib.send", fake_send)
    return gesendet


async def _person(db, name="Max Muster", email=None, pin=None):
    person = Person(name=name, email=email)
    db.add(person)
    await db.commit()
    await db.refresh(person)
    if pin:
        await stammdaten_service.person_pin_setzen(db, person, pin)
    return person


# --- Personenauswahl --------------------------------------------------------


@pytest.mark.asyncio
async def test_personen_auswahl_nur_bei_barcode_aus(client, db):
    await _person(db, "Anna Test", pin="1234")
    r = await client.get("/api/v1/auth/personen")
    assert r.status_code == 200
    namen = [p["name"] for p in r.json()]
    assert "Anna Test" in namen
    assert all("email" not in p for p in r.json())

    # Barcode-Modul aktiv -> Liste nicht öffentlich
    await config_service.set(db, "modul_barcode_aktiv", True)
    r = await client.get("/api/v1/auth/personen")
    assert r.status_code == 404


# --- Login mit PIN ----------------------------------------------------------


@pytest.mark.asyncio
async def test_name_pin_login(client, db):
    person = await _person(db, "Bea Test", pin="4711")

    # korrekt -> Cookie gesetzt
    r = await client.post("/api/v1/auth/name-pin", json={"person_id": person.id, "pin": "4711"})
    assert r.status_code == 200 and r.json()["name"] == "Bea Test"
    assert "geraetehaus_name" in r.cookies

    # falscher PIN
    r = await client.post("/api/v1/auth/name-pin", json={"person_id": person.id, "pin": "0000"})
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_personen_auswahl_liefert_gruppe(client, db):
    """Die Namensauswahl liefert gruppe_id/funktion_id, damit die Gruppe im
    Dienstbuch sofort vorgewählt werden kann."""
    from app.models.gruppe import Gruppe

    gruppe = Gruppe(name="Zug 1")
    db.add(gruppe)
    await db.commit()
    await db.refresh(gruppe)
    person = await _person(db, "Gerd Gruppe", pin="1234")
    person.gruppe_id = gruppe.id
    await db.commit()

    r = await client.get("/api/v1/auth/personen?suche=Gerd")
    assert r.status_code == 200
    eintrag = next(p for p in r.json() if p["name"] == "Gerd Gruppe")
    assert eintrag["gruppe_id"] == gruppe.id


@pytest.mark.asyncio
async def test_name_pin_pruefen_ohne_cookie(client, db):
    """Die PIN-Vorschau prüft den PIN und liefert Name/Bild, setzt aber KEINEN
    Cookie (nur für die Bildvorschau, kein Login)."""
    person = await _person(db, "Vera Vorschau", pin="4711")

    ok = await client.post(
        "/api/v1/auth/name-pin/pruefen", json={"person_id": person.id, "pin": "4711"}
    )
    assert ok.status_code == 200 and ok.json()["name"] == "Vera Vorschau"
    assert "geraetehaus_name" not in ok.cookies

    falsch = await client.post(
        "/api/v1/auth/name-pin/pruefen", json={"person_id": person.id, "pin": "0000"}
    )
    assert falsch.status_code == 401


@pytest.mark.asyncio
async def test_name_pin_ohne_pin_gesetzt(client, db):
    """Kein gesetzter PIN blockiert die Eintragung nicht mehr – die Person wird
    trotzdem eingeloggt, die Antwort meldet ohne_pin=True zur Kennzeichnung."""
    person = await _person(db, "Cem Test")  # kein PIN
    r = await client.post("/api/v1/auth/name-pin", json={"person_id": person.id, "pin": None})
    assert r.status_code == 200
    assert r.json()["name"] == "Cem Test"
    assert r.json()["ohne_pin"] is True
    assert "geraetehaus_name" in r.cookies

    ereignisse = await stammdaten_service.liste_person_ereignisse(db, person.id)
    assert any(e.typ == "ohne_pin_eingetragen" for e in ereignisse)


# --- PIN anfordern (Self-Service vs. Freigabe) ------------------------------


@pytest.mark.asyncio
async def test_pin_anfordern_mit_email_self_service(client, db, _fake_smtp):
    await config_service.set(db, "oeffentliche_basis_url", "https://fw.beispiel.de")
    person = await _person(db, "Dana Test", email="dana@example.org")

    r = await client.post("/api/v1/auth/pin-anfordern", json={"person_id": person.id})
    assert r.status_code == 202 and r.json()["weg"] == "mail"
    assert len(_fake_smtp) == 1


@pytest.mark.asyncio
async def test_pin_anfordern_ohne_email_freigabe(client, db, _fake_smtp):
    await config_service.set(db, "oeffentliche_basis_url", "https://fw.beispiel.de")
    await config_service.set(db, "notifier_email_recipients", "mod@example.org")
    person = await _person(db, "Erik Test")  # keine E-Mail

    r = await client.post("/api/v1/auth/pin-anfordern", json={"person_id": person.id})
    assert r.status_code == 202 and r.json()["weg"] == "freigabe"
    assert len(_fake_smtp) == 1


# --- PIN-Self-Service-Token -------------------------------------------------


@pytest.mark.asyncio
async def test_pin_setzen_per_token(client, db):
    person = await _person(db, "Finn Test", email="finn@example.org")
    token = await pin_service.pin_setzen_token_erstellen(db, person.id)

    info = await client.get(f"/api/v1/pin-setzen/{token.token}")
    assert info.status_code == 200 and info.json()["gueltig"] is True

    r = await client.post(f"/api/v1/pin-setzen/{token.token}", json={"pin": "9999"})
    assert r.status_code == 204

    await db.refresh(person)
    assert person.pin_gesetzt is True
    assert stammdaten_service.person_pin_korrekt(person, "9999")

    # bereits eingelöst -> 410
    r = await client.post(f"/api/v1/pin-setzen/{token.token}", json={"pin": "8888"})
    assert r.status_code == 410


# --- Gruppenführer-Freigabe -----------------------------------------------------


@pytest.mark.asyncio
async def test_person_freigabe_setzt_email_und_pin(client, db):
    person = await _person(db, "Gina Test")  # keine E-Mail
    token = await pin_service.freigabe_anfordern(db, person.id)

    info = await client.get(f"/api/v1/person-freigabe/{token.token}")
    assert info.status_code == 200 and info.json()["offen"] is True

    r = await client.post(
        f"/api/v1/person-freigabe/{token.token}/freigeben",
        json={"email": "gina@example.org", "pin": "2468"},
    )
    assert r.status_code == 204

    await db.refresh(person)
    assert person.email == "gina@example.org"
    assert person.pin_gesetzt is True

    # nicht mehr offen
    r = await client.post(
        f"/api/v1/person-freigabe/{token.token}/freigeben",
        json={"email": "x@example.org"},
    )
    assert r.status_code == 410


@pytest.mark.asyncio
async def test_person_freigabe_ablehnen(client, db):
    person = await _person(db, "Hugo Test")
    token = await pin_service.freigabe_anfordern(db, person.id)
    r = await client.post(f"/api/v1/person-freigabe/{token.token}/ablehnen")
    assert r.status_code == 204
    await db.refresh(token)
    assert token.status == "abgelehnt"


# --- Erinnerungs-Job --------------------------------------------------------


@pytest.mark.asyncio
async def test_erinnerungen_nur_ohne_pin_und_mit_mail(db, _fake_smtp):
    await config_service.set(db, "oeffentliche_basis_url", "https://fw.beispiel.de")
    await config_service.set(db, "pin_erinnerung_intervall_tage", 7)

    await _person(db, "Ohne PIN mit Mail", email="a@example.org")  # -> Mail
    await _person(db, "Ohne PIN ohne Mail")  # -> nein
    await _person(db, "Mit PIN", email="b@example.org", pin="1111")  # -> nein

    versendet = await pin_service.erinnerungen_versenden(db)
    assert versendet == 1

    # zweiter Lauf sofort danach: Intervall noch nicht erreicht -> nichts
    versendet = await pin_service.erinnerungen_versenden(db)
    assert versendet == 0


@pytest.mark.asyncio
async def test_erinnerungen_uebersprungen_wenn_barcode_aktiv(db):
    await config_service.set(db, "modul_barcode_aktiv", True)
    await config_service.set(db, "oeffentliche_basis_url", "https://fw.beispiel.de")
    await _person(db, "Egal", email="c@example.org")
    versendet = await pin_service.erinnerungen_versenden(db)
    assert versendet == 0


@pytest.mark.asyncio
async def test_barcode_modul_default_aus(db):
    liste = await feature_modul_service.liste(db)
    barcode = next(m for m in liste if m["key"] == "barcode")
    assert barcode["aktiv"] is False
    assert barcode["mitgliederseitig"] is False
