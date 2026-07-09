"""Tests für das Formular-Modul: CRUD, Einreichungsvalidierung, Mailversand,
Zugriff (Login-Pflicht / Modul inaktiv), Gruppenführer-Sichtbarkeit, Ablauf +
Auswertung."""

from datetime import datetime, timedelta, timezone

import pytest

from app.core import mitglied_session
from app.core.security import hash_secret
from app.models.person import Person
from app.services import formular_service
from app.services.config_service import config_service
from app.schemas.formular import FormularCreate, FormularFeldCreate, FormularUpdate


async def _token(client, db, rolle="admin", username=None):
    username = username or rolle
    db.add(Person(name=username, passwort_hash=hash_secret("geheim123"), gruppenfuehrer_rolle=rolle))
    await db.commit()
    login = await client.post(
        "/api/v1/auth/gruppenfuehrer/login", data={"username": username, "password": "geheim123"}
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
    r = await client.post("/api/v1/gruppenfuehrer/formulare", json={"name": "Rückmeldung"}, headers=h)
    assert r.status_code == 201
    fid = r.json()["id"]

    r = await client.post(
        f"/api/v1/gruppenfuehrer/formulare/{fid}/felder",
        json={"label": "Bewertung", "typ": "sterne", "max_sterne": 5, "pflicht": True},
        headers=h,
    )
    assert r.status_code == 201

    r = await client.get(f"/api/v1/gruppenfuehrer/formulare/{fid}", headers=h)
    assert r.status_code == 200
    assert len(r.json()["felder"]) == 1

    r = await client.put(
        f"/api/v1/gruppenfuehrer/formulare/{fid}", json={"aktiv": True, "gruppenfuehrer_sichtbar": True}, headers=h
    )
    assert r.status_code == 200 and r.json()["aktiv"] is True


@pytest.mark.asyncio
async def test_ungueltiger_feldtyp_abgelehnt(client, db):
    h = await _token(client, db)
    r = await client.post("/api/v1/gruppenfuehrer/formulare", json={"name": "F"}, headers=h)
    fid = r.json()["id"]
    r = await client.post(
        f"/api/v1/gruppenfuehrer/formulare/{fid}/felder", json={"label": "X", "typ": "quatsch"}, headers=h
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


# --- Gruppenführer-Sichtbarkeit --------------------------------------------------


@pytest.mark.asyncio
async def test_gruppenfuehrer_sichtbarkeit(client, db):
    formular = await _formular(db, gruppenfuehrer_sichtbar=False)
    h_mod = await _token(client, db, rolle="gruppenfuehrer", username="gf")

    r = await client.get(f"/api/v1/gruppenfuehrer/formulare/{formular.id}/einreichungen", headers=h_mod)
    assert r.status_code == 403

    # Freigeben -> Gruppenführer darf sehen
    await formular_service.formular_aktualisieren(
        db, formular, FormularUpdate(gruppenfuehrer_sichtbar=True)
    )
    r = await client.get(f"/api/v1/gruppenfuehrer/formulare/{formular.id}/einreichungen", headers=h_mod)
    assert r.status_code == 200

    # "sichtbar"-Liste zeigt dem Gruppenführer nur freigegebene Formulare
    r = await client.get("/api/v1/gruppenfuehrer/formulare/sichtbar", headers=h_mod)
    assert r.status_code == 200 and [f["id"] for f in r.json()] == [formular.id]


# --- Ablauf + Auswertung -----------------------------------------------------


@pytest.mark.asyncio
async def test_abgelaufenes_formular_nicht_absendbar(client, db):
    formular = await _formular(db, ablauf_am=datetime.now(timezone.utc) - timedelta(hours=1))
    await _feld(db, formular.id, label="Text", typ="text")

    # Detail + Liste blenden abgelaufene Formulare aus
    r = await client.get(f"/api/v1/formulare/{formular.id}")
    assert r.status_code == 404
    r = await client.get("/api/v1/formulare")
    assert all(f["id"] != formular.id for f in r.json())

    # Absenden abgelehnt
    r = await client.post(f"/api/v1/formulare/{formular.id}/einreichen", json={"antworten": {}})
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_zusammenfassung_aggregiert(client, db):
    h = await _token(client, db)
    formular = await _formular(db, gruppenfuehrer_sichtbar=True)
    sterne = await _feld(db, formular.id, label="Bewertung", typ="sterne", max_sterne=5)
    dd = await _feld(db, formular.id, label="Dienst", typ="dropdown", optionen=["A", "B"])

    for note, wahl in [(4, "A"), (2, "A"), (5, "B")]:
        r = await client.post(
            f"/api/v1/formulare/{formular.id}/einreichen",
            json={"antworten": {str(sterne.id): note, str(dd.id): wahl}},
        )
        assert r.status_code == 201

    r = await client.get(f"/api/v1/gruppenfuehrer/formulare/{formular.id}/zusammenfassung", headers=h)
    assert r.status_code == 200
    daten = r.json()
    assert daten["anzahl_einreichungen"] == 3
    sterne_stat = next(f for f in daten["felder"] if f["feld_id"] == sterne.id)
    assert sterne_stat["durchschnitt"] == pytest.approx((4 + 2 + 5) / 3, abs=0.01)
    dd_stat = next(f for f in daten["felder"] if f["feld_id"] == dd.id)
    assert dd_stat["verteilung"] == {"A": 2, "B": 1}


@pytest.mark.asyncio
async def test_ablauf_job_versendet_einmalig(db, monkeypatch):
    gesendet = []

    async def fake_send_an(self, _db, empfaenger, betreff, nachricht):
        gesendet.append((empfaenger, betreff, nachricht))

    monkeypatch.setattr(formular_service.EmailNotifier, "send_an", fake_send_an)
    await config_service.set(db, "notifier_email_aktiv", True)

    formular = await _formular(
        db, email_empfaenger="chef@wehr.de", ablauf_am=datetime.now(timezone.utc) - timedelta(minutes=1)
    )
    await _feld(db, formular.id, label="Note", typ="sterne", max_sterne=5)

    assert await formular_service.ablauf_zusammenfassungen_versenden(db) == 1
    assert gesendet and gesendet[0][0] == "chef@wehr.de"

    # Zweiter Lauf sendet nicht erneut (bereits markiert)
    gesendet.clear()
    assert await formular_service.ablauf_zusammenfassungen_versenden(db) == 0


# --- Ausbau: neue Feldtypen, Gates, Duplizieren, Export, Aufbewahrung ---------


@pytest.mark.asyncio
async def test_neue_feldtypen_validierung(client, db):
    formular = await _formular(db)
    skala = await _feld(db, formular.id, label="Skala", typ="skala", max_sterne=7)
    zahl = await _feld(db, formular.id, label="Alter", typ="zahl")
    mail = await _feld(db, formular.id, label="Mail", typ="email")
    jn = await _feld(db, formular.id, label="Dabei", typ="ja_nein")

    # Ungültige Werte
    r = await client.post(
        f"/api/v1/formulare/{formular.id}/einreichen",
        json={"antworten": {str(skala.id): 9, str(zahl.id): "abc", str(mail.id): "kaputt", str(jn.id): "Vielleicht"}},
    )
    assert r.status_code == 422
    for f in (skala, zahl, mail, jn):
        assert str(f.id) in r.json()["detail"]["felder"]

    # Gültige Werte
    r = await client.post(
        f"/api/v1/formulare/{formular.id}/einreichen",
        json={"antworten": {str(skala.id): 5, str(zahl.id): 42, str(mail.id): "a@b.de", str(jn.id): "Ja"}},
    )
    assert r.status_code == 201


@pytest.mark.asyncio
async def test_kapazitaet_ausgebucht(client, db):
    formular = await _formular(db, max_einreichungen=1)
    await _feld(db, formular.id, label="Text", typ="text")
    r = await client.post(f"/api/v1/formulare/{formular.id}/einreichen", json={"antworten": {}})
    assert r.status_code == 201
    r = await client.post(f"/api/v1/formulare/{formular.id}/einreichen", json={"antworten": {}})
    assert r.status_code == 409


@pytest.mark.asyncio
async def test_startdatum_noch_nicht_verfuegbar(client, db):
    formular = await _formular(db, start_am=datetime.now(timezone.utc) + timedelta(days=1))
    r = await client.get(f"/api/v1/formulare/{formular.id}")
    assert r.status_code == 404
    r = await client.get("/api/v1/formulare")
    assert all(f["id"] != formular.id for f in r.json())


@pytest.mark.asyncio
async def test_einwilligung_pflicht(client, db):
    formular = await _formular(db, einwilligung_text="Ich stimme zu.")
    await _feld(db, formular.id, label="Text", typ="text")
    r = await client.post(f"/api/v1/formulare/{formular.id}/einreichen", json={"antworten": {}})
    assert r.status_code == 422
    r = await client.post(
        f"/api/v1/formulare/{formular.id}/einreichen", json={"antworten": {}, "einwilligung": True}
    )
    assert r.status_code == 201


@pytest.mark.asyncio
async def test_honeypot_verwirft_still(client, db):
    formular = await _formular(db)
    await _feld(db, formular.id, label="Text", typ="text")
    r = await client.post(
        f"/api/v1/formulare/{formular.id}/einreichen", json={"antworten": {}, "hp": "bot"}
    )
    assert r.status_code == 201
    assert len(await formular_service.einreichungen_fuer(db, formular.id)) == 0


@pytest.mark.asyncio
async def test_mehrfach_verhindern_pro_person(client, db):
    person = Person(name="Max Muster")
    db.add(person)
    await db.commit()
    formular = await _formular(db, mehrfach_verhindern=True)
    await _feld(db, formular.id, label="Text", typ="text")
    cookies = {"geraetehaus_name": mitglied_session.signiere_name("Max Muster")}
    r = await client.post(
        f"/api/v1/formulare/{formular.id}/einreichen", json={"antworten": {}}, cookies=cookies
    )
    assert r.status_code == 201
    r = await client.post(
        f"/api/v1/formulare/{formular.id}/einreichen", json={"antworten": {}}, cookies=cookies
    )
    assert r.status_code == 409


@pytest.mark.asyncio
async def test_oeffentliches_ergebnis_ohne_freitext(client, db):
    formular = await _formular(db, ergebnis_oeffentlich=True)
    sterne = await _feld(db, formular.id, label="Note", typ="sterne", max_sterne=5)
    text = await _feld(db, formular.id, label="Kommentar", typ="text")
    await client.post(
        f"/api/v1/formulare/{formular.id}/einreichen",
        json={"antworten": {str(sterne.id): 4, str(text.id): "geheim"}},
    )
    r = await client.get(f"/api/v1/formulare/{formular.id}/ergebnis")
    assert r.status_code == 200
    felder = {f["feld_id"]: f for f in r.json()["felder"]}
    assert felder[sterne.id]["durchschnitt"] == 4
    assert felder[text.id]["texte"] is None  # Freitext öffentlich ausgeblendet

    # Ohne Freigabe: 404
    formular2 = await _formular(db)
    r = await client.get(f"/api/v1/formulare/{formular2.id}/ergebnis")
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_duplizieren(client, db):
    h = await _token(client, db)
    formular = await _formular(db, aktiv=True)
    await _feld(db, formular.id, label="Note", typ="sterne")
    await client.post(f"/api/v1/formulare/{formular.id}/einreichen", json={"antworten": {}})

    r = await client.post(f"/api/v1/gruppenfuehrer/formulare/{formular.id}/duplizieren", headers=h)
    assert r.status_code == 201
    kopie = r.json()
    assert kopie["name"].endswith("(Kopie)") and kopie["aktiv"] is False
    assert len(kopie["felder"]) == 1
    # Einreichungen werden nicht mitkopiert
    assert len(await formular_service.einreichungen_fuer(db, kopie["id"])) == 0


@pytest.mark.asyncio
async def test_csv_export(client, db):
    h = await _token(client, db)
    formular = await _formular(db, gruppenfuehrer_sichtbar=True)
    feld = await _feld(db, formular.id, label="Name", typ="text")
    await client.post(
        f"/api/v1/formulare/{formular.id}/einreichen", json={"antworten": {str(feld.id): "Anna"}}
    )
    r = await client.get(f"/api/v1/gruppenfuehrer/formulare/{formular.id}/export.csv", headers=h)
    assert r.status_code == 200
    assert "Name" in r.text and "Anna" in r.text


@pytest.mark.asyncio
async def test_aufbewahrung_job_loescht_alte(client, db):
    formular = await _formular(db, aufbewahrung_tage=1)
    await _feld(db, formular.id, label="Text", typ="text")
    await client.post(f"/api/v1/formulare/{formular.id}/einreichen", json={"antworten": {}})

    # Einreichung künstlich altern
    eintraege = await formular_service.einreichungen_fuer(db, formular.id)
    eintraege[0].erstellt_am = datetime.now(timezone.utc) - timedelta(days=5)
    await db.commit()

    assert await formular_service.einreichungen_aufbewahrung_bereinigen(db) == 1
    assert len(await formular_service.einreichungen_fuer(db, formular.id)) == 0


@pytest.mark.asyncio
async def test_datei_referenz_validierung(client, db):
    formular = await _formular(db)
    datei = await _feld(db, formular.id, label="Foto", typ="datei", pflicht=True)
    r = await client.post(
        f"/api/v1/formulare/{formular.id}/einreichen",
        json={"antworten": {str(datei.id): "/uploads/formulare/gibtsnicht.png"}},
    )
    assert r.status_code == 422
    assert str(datei.id) in r.json()["detail"]["felder"]


@pytest.mark.asyncio
async def test_ablauf_job_persistiert_marker_trotz_transaktionsfehler(db, monkeypatch):
    """Regression (JAVASCRIPT-39): ein die DB-Transaktion invalidierender Fehler beim
    Erzeugen/Versenden der Ablauf-Auswertung darf den 'gesendet'-Marker nicht verlieren.
    Sonst wird dasselbe abgelaufene Formular alle 15 min erneut verarbeitet und der
    Scheduler-Job schlägt jedes Mal fehl (Endlosschleife)."""
    from sqlalchemy import text

    await config_service.set(db, "notifier_email_aktiv", True)
    await _formular(
        db,
        email_empfaenger="a@example.org",
        ablauf_am=datetime(2020, 1, 1, tzinfo=timezone.utc),
    )

    async def _kaputt(_db, _formular):
        # Echter DB-Fehler → asyncpg-Transaktion wird invalidiert (wie in Produktion).
        await _db.execute(text("SELECT 1 FROM tabelle_die_es_nicht_gibt"))

    monkeypatch.setattr(formular_service, "zusammenfassung", _kaputt)

    # Der Job darf NICHT werfen …
    await formular_service.ablauf_zusammenfassungen_versenden(db)
    # … und der Marker ist persistiert → ein zweiter Lauf findet nichts mehr.
    assert await formular_service.ablauf_zusammenfassungen_versenden(db) == 0
