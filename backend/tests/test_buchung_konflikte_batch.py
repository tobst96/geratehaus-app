"""Batch-Konfliktvergleich für Buchungen (Etappe AE): ein Request statt einem
pro ausstehender Buchung."""

from datetime import datetime, timedelta, timezone

from app.core.security import hash_secret
from app.models.fahrzeug import Fahrzeug
from app.models.person import Person
from app.schemas.buchung import BuchungAnfrage
from app.services import buchung_service


async def _token(client, db, username="admin", rolle="admin"):
    db.add(Person(name=username, email=username, passwort_hash=hash_secret("geheim123"), gruppenfuehrer_rolle=rolle))
    await db.commit()
    r = await client.post(
        "/api/v1/auth/gruppenfuehrer/login", data={"username": username, "password": "geheim123"}
    )
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


async def _fahrzeug_und_person(db, name="MTW"):
    fahrzeug = Fahrzeug(name=name, aktiv=True, buchbar=True, sitzplaetze=[])
    db.add(fahrzeug)
    person = Person(name=f"{name}-Person")
    db.add(person)
    await db.commit()
    await db.refresh(fahrzeug)
    await db.refresh(person)
    return fahrzeug, person


async def _buchung(db, fahrzeug, person, start_versatz_std=24, dauer_std=2):
    von = datetime.now(timezone.utc) + timedelta(hours=start_versatz_std)
    bis = von + timedelta(hours=dauer_std)
    daten = BuchungAnfrage(fahrzeug_id=fahrzeug.id, von=von, bis=bis, zweck="Übung")
    buchung, _konflikt = await buchung_service.anfrage_erstellen(db, person.id, daten)
    return buchung


async def test_konfliktvergleich_batch_erkennt_ueberschneidung(db):
    fahrzeug, person = await _fahrzeug_und_person(db)
    a = await _buchung(db, fahrzeug, person, start_versatz_std=24, dauer_std=4)
    # Überlappt mit a (startet mitten in a's Zeitraum).
    b = await _buchung(db, fahrzeug, person, start_versatz_std=26, dauer_std=4)
    # Kein Überschneiden mit a oder b.
    c = await _buchung(db, fahrzeug, person, start_versatz_std=100, dauer_std=1)

    ergebnis = await buchung_service.konfliktvergleich_batch(db, [a.id, b.id, c.id])

    assert {k.id for k in ergebnis[a.id]} == {b.id}
    assert {k.id for k in ergebnis[b.id]} == {a.id}
    assert ergebnis[c.id] == []


async def test_konfliktvergleich_batch_trennt_nach_fahrzeug(db):
    fahrzeug_1, person = await _fahrzeug_und_person(db, "MTW")
    fahrzeug_2, _ = await _fahrzeug_und_person(db, "LF")
    # Gleicher Zeitraum, aber unterschiedliche Fahrzeuge - kein Konflikt.
    a = await _buchung(db, fahrzeug_1, person, start_versatz_std=24, dauer_std=4)
    b = await _buchung(db, fahrzeug_2, person, start_versatz_std=24, dauer_std=4)

    ergebnis = await buchung_service.konfliktvergleich_batch(db, [a.id, b.id])

    assert ergebnis[a.id] == []
    assert ergebnis[b.id] == []


async def test_konfliktvergleich_batch_leere_liste():
    assert await buchung_service.konfliktvergleich_batch(None, []) == {}  # type: ignore[arg-type]


async def test_konflikte_batch_endpunkt(client, db):
    h = await _token(client, db)
    fahrzeug, person = await _fahrzeug_und_person(db)
    a = await _buchung(db, fahrzeug, person, start_versatz_std=24, dauer_std=4)
    b = await _buchung(db, fahrzeug, person, start_versatz_std=26, dauer_std=4)

    r = await client.post(
        "/api/v1/gruppenfuehrer/buchungen/konflikte-batch",
        json={"buchung_ids": [a.id, b.id]},
        headers=h,
    )
    assert r.status_code == 200
    daten = r.json()
    assert [k["id"] for k in daten[str(a.id)]] == [b.id]
    assert [k["id"] for k in daten[str(b.id)]] == [a.id]


async def test_konflikte_batch_endpunkt_ohne_recht_403(client, db):
    h = await _token(client, db, username="gf", rolle="gruppenfuehrer")
    r = await client.post(
        "/api/v1/gruppenfuehrer/buchungen/konflikte-batch", json={"buchung_ids": []}, headers=h
    )
    assert r.status_code == 403
