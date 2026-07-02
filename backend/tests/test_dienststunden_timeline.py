from datetime import date

from app.models.funktion import FunktionDienststunden
from app.models.person import Person
from app.schemas.dienststunden import DienststundenErfassen
from app.services import dienststunden_service, stammdaten_service


async def _person(db, name="Timeline Person"):
    person = Person(name=name)
    db.add(person)
    await db.commit()
    await db.refresh(person)
    return person


async def _funktion(db, name="Maschinist"):
    funktion = FunktionDienststunden(name=name, schwellenwert_stunden=0, aktiv=True)
    db.add(funktion)
    await db.commit()
    await db.refresh(funktion)
    return funktion


async def test_erfassen_schreibt_person_ereignis(db):
    """Regression: eine Dienststunden-Erfassung wird als eigenes PersonEreignis
    (`dienststunden_erfasst`) in der Timeline protokolliert, inkl. Funktion."""
    person = await _person(db)
    funktion = await _funktion(db)

    await dienststunden_service.erfassen(
        db,
        person.id,
        DienststundenErfassen(funktion_id=funktion.id, stunden=1.5, datum=date(2026, 5, 15)),
    )

    ereignisse = await stammdaten_service.liste_person_ereignisse(db, person.id)
    passende = [e for e in ereignisse if e.typ == "dienststunden_erfasst"]
    assert len(passende) == 1
    assert funktion.name in passende[0].beschreibung
