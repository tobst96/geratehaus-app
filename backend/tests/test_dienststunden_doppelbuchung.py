import pytest
from datetime import date

from app.models.funktion import FunktionDienststunden
from app.models.person import Person
from app.schemas.dienststunden import DienststundenErfassen
from app.services import dienststunden_service


async def _person_anlegen(db, name="Test Person"):
    person = Person(name=name)
    db.add(person)
    await db.commit()
    await db.refresh(person)
    return person


async def _funktion_anlegen(db, name="Atemschutz"):
    funktion = FunktionDienststunden(name=name, schwellenwert_stunden=0, aktiv=True)
    db.add(funktion)
    await db.commit()
    await db.refresh(funktion)
    return funktion


async def test_doppelbuchung_gleiche_person_funktion_datum_wird_geblockt(db):
    person = await _person_anlegen(db)
    funktion = await _funktion_anlegen(db)
    daten = DienststundenErfassen(funktion_id=funktion.id, stunden=2.0, datum=date(2026, 1, 15))

    await dienststunden_service.erfassen(db, person.id, daten)

    with pytest.raises(ValueError, match="existiert bereits"):
        await dienststunden_service.erfassen(db, person.id, daten)


async def test_gleiche_person_und_funktion_anderes_datum_erlaubt(db):
    person = await _person_anlegen(db)
    funktion = await _funktion_anlegen(db)

    await dienststunden_service.erfassen(
        db, person.id, DienststundenErfassen(funktion_id=funktion.id, stunden=2.0, datum=date(2026, 1, 15))
    )
    await dienststunden_service.erfassen(
        db, person.id, DienststundenErfassen(funktion_id=funktion.id, stunden=2.0, datum=date(2026, 1, 16))
    )

    summen = await dienststunden_service.eigene_summen(db, person.id)
    eintrag = next((s for s in summen if s.funktion_id == funktion.id), None)
    assert eintrag is not None
    assert eintrag.summe_stunden == 4.0


async def test_gleiche_person_datum_andere_funktion_erlaubt(db):
    person = await _person_anlegen(db)
    funktion1 = await _funktion_anlegen(db, name="Funktion A")
    funktion2 = await _funktion_anlegen(db, name="Funktion B")
    heute = date(2026, 1, 15)

    await dienststunden_service.erfassen(
        db, person.id, DienststundenErfassen(funktion_id=funktion1.id, stunden=1.0, datum=heute)
    )
    await dienststunden_service.erfassen(
        db, person.id, DienststundenErfassen(funktion_id=funktion2.id, stunden=1.0, datum=heute)
    )
