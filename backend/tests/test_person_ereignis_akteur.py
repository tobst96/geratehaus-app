"""Personen-Verlauf: handelnder Akteur wird protokolliert (Backlog Etappe T).

Deckt zwei Dinge ab: (1) das neue, optionale `akteur_name`-Feld wird von
`person_ereignis_protokollieren` und den Aufrufstellen korrekt durchgereicht,
(2) Änderungen an Benachrichtigungskanälen/-Abos - der eigentliche, im Backlog
beschriebene Bug - landen jetzt überhaupt in der Timeline.
"""

from app.core.security import hash_secret
from app.models.person import Person
from app.services import benachrichtigungskanal_service as kanal_service
from app.services import stammdaten_service


async def _person(db, name="Verlauf Person"):
    person = Person(name=name)
    db.add(person)
    await db.commit()
    await db.refresh(person)
    return person


async def _admin_token(client, db, name="admin"):
    db.add(Person(name=name, email=name, passwort_hash=hash_secret("geheim123"), gruppenfuehrer_rolle="admin"))
    await db.commit()
    login = await client.post(
        "/api/v1/auth/gruppenfuehrer/login", data={"username": name, "password": "geheim123"}
    )
    return login.json()["access_token"]


async def _letztes_ereignis(db, person_id):
    ereignisse = await stammdaten_service.liste_person_ereignisse(db, person_id)
    return ereignisse[-1] if ereignisse else None


async def test_person_ereignis_protokollieren_ohne_akteur_bleibt_null(db):
    person = await _person(db)
    await stammdaten_service.person_ereignis_protokollieren(
        db, person.id, "pin_gesetzt", "PIN eingerichtet/geändert"
    )
    await db.commit()
    ereignis = await _letztes_ereignis(db, person.id)
    assert ereignis.akteur_name is None


async def test_person_ereignis_protokollieren_mit_akteur(db):
    person = await _person(db)
    await stammdaten_service.person_ereignis_protokollieren(
        db, person.id, "stammdaten_geaendert", "Geändert: Name", "Max Admin"
    )
    await db.commit()
    ereignis = await _letztes_ereignis(db, person.id)
    assert ereignis.akteur_name == "Max Admin"


async def test_kanal_setzen_neu_protokolliert_akteur(db):
    person = await _person(db)
    await kanal_service.setzen(db, person.id, "telegram", "123", True, "Max Admin")
    ereignis = await _letztes_ereignis(db, person.id)
    assert ereignis is not None
    assert ereignis.typ == "benachrichtigungskanal_geaendert"
    assert ereignis.akteur_name == "Max Admin"
    assert "Telegram" in ereignis.beschreibung
    assert "eingerichtet" in ereignis.beschreibung


async def test_kanal_setzen_unveraendert_protokolliert_nichts_neues(db):
    person = await _person(db)
    await kanal_service.setzen(db, person.id, "telegram", "123", True, "Max Admin")
    anzahl_vorher = len(await stammdaten_service.liste_person_ereignisse(db, person.id))
    # Identische Werte erneut setzen - kein inhaltlicher Unterschied.
    await kanal_service.setzen(db, person.id, "telegram", "123", True, "Max Admin")
    anzahl_nachher = len(await stammdaten_service.liste_person_ereignisse(db, person.id))
    assert anzahl_nachher == anzahl_vorher


async def test_kanal_setzen_aenderung_protokolliert_diff(db):
    person = await _person(db)
    await kanal_service.setzen(db, person.id, "telegram", "123", True, "Max Admin")
    await kanal_service.setzen(db, person.id, "telegram", "123", False, "Max Admin")
    ereignis = await _letztes_ereignis(db, person.id)
    assert "deaktiviert" in ereignis.beschreibung
    assert ereignis.akteur_name == "Max Admin"


async def test_kanal_loeschen_protokolliert_akteur(db):
    person = await _person(db)
    await kanal_service.setzen(db, person.id, "telegram", "123", True)
    await kanal_service.loeschen(db, person.id, "telegram", "Max Admin")
    ereignis = await _letztes_ereignis(db, person.id)
    assert ereignis.typ == "benachrichtigungskanal_geaendert"
    assert "entfernt" in ereignis.beschreibung
    assert ereignis.akteur_name == "Max Admin"


async def test_set_abo_aktivieren_und_deaktivieren_protokolliert(db):
    person = await _person(db)
    ereignis_key = kanal_service.EREIGNIS_TYPEN[0].key

    await kanal_service.set_abo(db, person.id, ereignis_key, True, "Max Admin")
    aktiviert = await _letztes_ereignis(db, person.id)
    assert aktiviert.typ == "ereignis_abo_geaendert"
    assert "aktiviert" in aktiviert.beschreibung
    assert aktiviert.akteur_name == "Max Admin"

    await kanal_service.set_abo(db, person.id, ereignis_key, False, "Max Admin")
    deaktiviert = await _letztes_ereignis(db, person.id)
    assert "deaktiviert" in deaktiviert.beschreibung
    assert deaktiviert.akteur_name == "Max Admin"


async def test_kanal_setzen_endpunkt_protokolliert_admin_namen(client, db):
    person = await _person(db)
    token = await _admin_token(client, db, name="Chefin")
    h = {"Authorization": f"Bearer {token}"}

    resp = await client.put(
        f"/api/v1/gruppenfuehrer/personen/{person.id}/kanaele/telegram",
        json={"zielwert": "999", "aktiv": True},
        headers=h,
    )
    assert resp.status_code == 200

    ereignis = await _letztes_ereignis(db, person.id)
    assert ereignis.typ == "benachrichtigungskanal_geaendert"
    assert ereignis.akteur_name == "Chefin"


async def test_person_aktualisieren_endpunkt_protokolliert_admin_namen(client, db):
    person = await _person(db, name="Alte Ansicht")
    token = await _admin_token(client, db, name="Chefin")
    h = {"Authorization": f"Bearer {token}"}

    resp = await client.put(
        f"/api/v1/gruppenfuehrer/stammdaten/personen/{person.id}",
        json={"vorname": "Neue"},
        headers=h,
    )
    assert resp.status_code == 200

    ereignis = await _letztes_ereignis(db, person.id)
    assert ereignis.akteur_name == "Chefin"
