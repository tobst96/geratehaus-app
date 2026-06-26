from datetime import date

from app.models.funktion import FunktionDienststunden
from app.models.person import Person
from app.services import dienststunden_service


async def _person_anlegen(db, name="Max Mustermann"):
    person = Person(name=name)
    db.add(person)
    await db.commit()
    await db.refresh(person)
    return person


async def _funktion_anlegen(db, name="Atemschutzgeräteträger", schwellenwert=20.0):
    funktion = FunktionDienststunden(name=name, schwellenwert_stunden=schwellenwert, aktiv=True)
    db.add(funktion)
    await db.commit()
    await db.refresh(funktion)
    return funktion


async def test_person_unter_schwellenwert_taucht_nicht_in_liste_auf(db):
    person = await _person_anlegen(db)
    funktion = await _funktion_anlegen(db, schwellenwert=20.0)
    await dienststunden_service.erfassen(
        db, person.id, dienststunden_service.DienststundenErfassen(
            funktion_id=funktion.id, stunden=5.0, datum=date.today()
        )
    )

    liste = await dienststunden_service.schwellenwert_liste(db)
    assert liste == []


async def test_person_ueber_schwellenwert_erscheint_in_liste(db):
    person = await _person_anlegen(db)
    funktion = await _funktion_anlegen(db, schwellenwert=20.0)
    await dienststunden_service.erfassen(
        db, person.id, dienststunden_service.DienststundenErfassen(
            funktion_id=funktion.id, stunden=25.0, datum=date.today()
        )
    )

    liste = await dienststunden_service.schwellenwert_liste(db)
    assert len(liste) == 1
    eintrag = liste[0]
    assert eintrag.person_id == person.id
    assert eintrag.summe_stunden == 25.0
    assert eintrag.ueberschuss_stunden == 5.0
    assert eintrag.uebernommen_stunden == 0.0


async def test_uebernommene_stunden_reduzieren_ueberschuss(db):
    person = await _person_anlegen(db)
    funktion = await _funktion_anlegen(db, schwellenwert=20.0)
    await dienststunden_service.erfassen(
        db, person.id, dienststunden_service.DienststundenErfassen(
            funktion_id=funktion.id, stunden=25.0, datum=date.today()
        )
    )

    await dienststunden_service.uebernahme_eintragen(db, person.id, funktion.id, 3.0)

    liste = await dienststunden_service.schwellenwert_liste(db)
    assert len(liste) == 1
    assert liste[0].uebernommen_stunden == 3.0
    assert liste[0].ueberschuss_stunden == 2.0


async def test_vollstaendig_uebernommene_stunden_entfernen_person_aus_liste(db):
    person = await _person_anlegen(db)
    funktion = await _funktion_anlegen(db, schwellenwert=20.0)
    await dienststunden_service.erfassen(
        db, person.id, dienststunden_service.DienststundenErfassen(
            funktion_id=funktion.id, stunden=25.0, datum=date.today()
        )
    )

    await dienststunden_service.uebernahme_eintragen(db, person.id, funktion.id, 5.0)

    liste = await dienststunden_service.schwellenwert_liste(db)
    assert liste == []


async def test_endpunkt_liste_und_uebernahme_erfordert_moderator(client):
    response = await client.get("/api/v1/moderator/listen/dienststunden-schwellenwert")
    assert response.status_code == 401
    response = await client.post(
        "/api/v1/moderator/listen/dienststunden-schwellenwert/uebernahme",
        json={"person_id": 1, "funktion_id": 1, "stunden": 1},
    )
    assert response.status_code == 401
