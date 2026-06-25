import time
from pathlib import Path

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.einsatz_feld import EinsatzFeldDefinition
from app.models.fahrzeug import Fahrzeug
from app.models.funktion import FunktionDienststunden, FunktionEinsatz
from app.models.gruppe import Gruppe
from app.models.person import Person
from app.schemas.einsatz_feld import (
    EinsatzFeldDefinitionCreate,
    EinsatzFeldDefinitionUpdate,
    schluessel_aus_label,
)
from app.schemas.person import PersonCreate, PersonUpdate
from app.schemas.stammdaten import (
    FahrzeugCreate,
    FahrzeugUpdate,
    FunktionDienststundenCreate,
    FunktionDienststundenUpdate,
    FunktionEinsatzCreate,
    FunktionEinsatzUpdate,
    GruppeCreate,
    GruppeUpdate,
)
from app.services.config_service import config_service


def _voller_name(vorname: str, zwischenname: str | None, nachname: str) -> str:
    teile = [vorname, zwischenname, nachname]
    return " ".join(teil for teil in teile if teil)


async def liste_fahrzeuge(db: AsyncSession, nur_aktive: bool = True) -> list[Fahrzeug]:
    stmt = select(Fahrzeug)
    if nur_aktive:
        stmt = stmt.where(Fahrzeug.aktiv.is_(True))
    result = await db.execute(stmt.order_by(Fahrzeug.name))
    return list(result.scalars().all())


async def fahrzeug_anlegen(db: AsyncSession, daten: FahrzeugCreate) -> Fahrzeug:
    fahrzeug = Fahrzeug(**daten.model_dump())
    db.add(fahrzeug)
    await db.commit()
    await db.refresh(fahrzeug)
    return fahrzeug


async def fahrzeug_aktualisieren(
    db: AsyncSession, fahrzeug: Fahrzeug, daten: FahrzeugUpdate
) -> Fahrzeug:
    for feld, wert in daten.model_dump(exclude_unset=True).items():
        setattr(fahrzeug, feld, wert)
    await db.commit()
    await db.refresh(fahrzeug)
    return fahrzeug


async def fahrzeug_loeschen(db: AsyncSession, fahrzeug: Fahrzeug) -> None:
    await db.delete(fahrzeug)
    await db.commit()


async def get_fahrzeug(db: AsyncSession, fahrzeug_id: int) -> Fahrzeug | None:
    result = await db.execute(select(Fahrzeug).where(Fahrzeug.id == fahrzeug_id))
    return result.scalar_one_or_none()


async def liste_funktionen_einsatz(db: AsyncSession, nur_aktive: bool = True) -> list[FunktionEinsatz]:
    stmt = select(FunktionEinsatz)
    if nur_aktive:
        stmt = stmt.where(FunktionEinsatz.aktiv.is_(True))
    result = await db.execute(stmt.order_by(FunktionEinsatz.name))
    return list(result.scalars().all())


async def funktion_einsatz_anlegen(db: AsyncSession, daten: FunktionEinsatzCreate) -> FunktionEinsatz:
    funktion = FunktionEinsatz(**daten.model_dump())
    db.add(funktion)
    await db.commit()
    await db.refresh(funktion)
    return funktion


async def funktion_einsatz_aktualisieren(
    db: AsyncSession, funktion: FunktionEinsatz, daten: FunktionEinsatzUpdate
) -> FunktionEinsatz:
    for feld, wert in daten.model_dump(exclude_unset=True).items():
        setattr(funktion, feld, wert)
    await db.commit()
    await db.refresh(funktion)
    return funktion


async def funktion_einsatz_loeschen(db: AsyncSession, funktion: FunktionEinsatz) -> None:
    await db.delete(funktion)
    await db.commit()


async def get_funktion_einsatz(db: AsyncSession, funktion_id: int) -> FunktionEinsatz | None:
    result = await db.execute(select(FunktionEinsatz).where(FunktionEinsatz.id == funktion_id))
    return result.scalar_one_or_none()


async def liste_funktionen_dienststunden(
    db: AsyncSession, nur_aktive: bool = True
) -> list[FunktionDienststunden]:
    stmt = select(FunktionDienststunden)
    if nur_aktive:
        stmt = stmt.where(FunktionDienststunden.aktiv.is_(True))
    result = await db.execute(stmt.order_by(FunktionDienststunden.name))
    return list(result.scalars().all())


async def funktion_dienststunden_anlegen(
    db: AsyncSession, daten: FunktionDienststundenCreate
) -> FunktionDienststunden:
    funktion = FunktionDienststunden(**daten.model_dump())
    db.add(funktion)
    await db.commit()
    await db.refresh(funktion)
    return funktion


async def funktion_dienststunden_aktualisieren(
    db: AsyncSession, funktion: FunktionDienststunden, daten: FunktionDienststundenUpdate
) -> FunktionDienststunden:
    for feld, wert in daten.model_dump(exclude_unset=True).items():
        setattr(funktion, feld, wert)
    await db.commit()
    await db.refresh(funktion)
    return funktion


async def funktion_dienststunden_loeschen(db: AsyncSession, funktion: FunktionDienststunden) -> None:
    await db.delete(funktion)
    await db.commit()


async def get_funktion_dienststunden(
    db: AsyncSession, funktion_id: int
) -> FunktionDienststunden | None:
    result = await db.execute(
        select(FunktionDienststunden).where(FunktionDienststunden.id == funktion_id)
    )
    return result.scalar_one_or_none()


# --- Gruppen --------------------------------------------------------------------


async def liste_gruppen(db: AsyncSession, nur_aktive: bool = True) -> list[Gruppe]:
    stmt = select(Gruppe)
    if nur_aktive:
        stmt = stmt.where(Gruppe.aktiv.is_(True))
    result = await db.execute(stmt.order_by(Gruppe.name))
    return list(result.scalars().all())


async def gruppe_anlegen(db: AsyncSession, daten: GruppeCreate) -> Gruppe:
    gruppe = Gruppe(**daten.model_dump())
    db.add(gruppe)
    await db.commit()
    await db.refresh(gruppe)
    return gruppe


async def gruppe_aktualisieren(db: AsyncSession, gruppe: Gruppe, daten: GruppeUpdate) -> Gruppe:
    for feld, wert in daten.model_dump(exclude_unset=True).items():
        setattr(gruppe, feld, wert)
    await db.commit()
    await db.refresh(gruppe)
    return gruppe


async def gruppe_loeschen(db: AsyncSession, gruppe: Gruppe) -> None:
    await db.delete(gruppe)
    await db.commit()


async def get_gruppe(db: AsyncSession, gruppe_id: int) -> Gruppe | None:
    result = await db.execute(select(Gruppe).where(Gruppe.id == gruppe_id))
    return result.scalar_one_or_none()


# --- Einsatz-Felder (frei konfigurierbare Zusatzfelder) ------------------------


async def liste_einsatz_felder(db: AsyncSession, nur_aktive: bool = True) -> list[EinsatzFeldDefinition]:
    stmt = select(EinsatzFeldDefinition).order_by(EinsatzFeldDefinition.reihenfolge)
    if nur_aktive:
        stmt = stmt.where(EinsatzFeldDefinition.aktiv.is_(True))
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def einsatz_feld_anlegen(
    db: AsyncSession, daten: EinsatzFeldDefinitionCreate
) -> EinsatzFeldDefinition:
    basis_schluessel = schluessel_aus_label(daten.label)
    schluessel = basis_schluessel
    zaehler = 1
    while (
        await db.execute(
            select(EinsatzFeldDefinition).where(EinsatzFeldDefinition.schluessel == schluessel)
        )
    ).scalar_one_or_none() is not None:
        zaehler += 1
        schluessel = f"{basis_schluessel}_{zaehler}"

    feld = EinsatzFeldDefinition(
        schluessel=schluessel,
        label=daten.label,
        typ=daten.typ,
        reihenfolge=daten.reihenfolge,
        aktiv=daten.aktiv,
    )
    db.add(feld)
    await db.commit()
    await db.refresh(feld)
    return feld


async def einsatz_feld_aktualisieren(
    db: AsyncSession, feld: EinsatzFeldDefinition, daten: EinsatzFeldDefinitionUpdate
) -> EinsatzFeldDefinition:
    for name, wert in daten.model_dump(exclude_unset=True).items():
        setattr(feld, name, wert)
    await db.commit()
    await db.refresh(feld)
    return feld


async def einsatz_feld_loeschen(db: AsyncSession, feld: EinsatzFeldDefinition) -> None:
    await db.delete(feld)
    await db.commit()


async def get_einsatz_feld(db: AsyncSession, feld_id: int) -> EinsatzFeldDefinition | None:
    result = await db.execute(select(EinsatzFeldDefinition).where(EinsatzFeldDefinition.id == feld_id))
    return result.scalar_one_or_none()


# --- Personen -------------------------------------------------------------


async def liste_personen(db: AsyncSession) -> list[Person]:
    sortierung = await config_service.get(db, "personen_sortierung", "nachname")
    stmt = select(Person)
    if sortierung == "gruppe_nachname":
        stmt = stmt.outerjoin(Gruppe, Person.gruppe_id == Gruppe.id).order_by(
            Gruppe.name, Person.nachname, Person.vorname, Person.name
        )
    else:
        stmt = stmt.order_by(Person.nachname, Person.vorname, Person.name)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_person(db: AsyncSession, person_id: int) -> Person | None:
    result = await db.execute(select(Person).where(Person.id == person_id))
    return result.scalar_one_or_none()


async def person_anlegen(db: AsyncSession, daten: PersonCreate) -> Person:
    person = Person(
        vorname=daten.vorname,
        zwischenname=daten.zwischenname,
        nachname=daten.nachname,
        name=_voller_name(daten.vorname, daten.zwischenname, daten.nachname),
        gruppe_id=daten.gruppe_id,
    )
    db.add(person)
    await db.commit()
    await db.refresh(person)
    return person


async def person_aktualisieren(db: AsyncSession, person: Person, daten: PersonUpdate) -> Person:
    for feld, wert in daten.model_dump(exclude_unset=True).items():
        setattr(person, feld, wert)
    person.name = _voller_name(
        person.vorname or "", person.zwischenname, person.nachname or ""
    ).strip() or person.name
    await db.commit()
    await db.refresh(person)
    return person


async def person_loeschen(db: AsyncSession, person: Person) -> None:
    await db.delete(person)
    await db.commit()


async def person_bild_speichern(db: AsyncSession, person: Person, datei: UploadFile) -> Person:
    """Speichert das Profilbild einer Person (PNG/JPEG) und aktualisiert bild_url."""
    erlaubte_typen = {"image/png": ".png", "image/jpeg": ".jpg"}
    if datei.content_type not in erlaubte_typen:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Bild muss PNG oder JPEG sein.",
        )
    inhalt = await datei.read()
    if len(inhalt) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Bild darf maximal 5 MB groß sein.",
        )

    upload_verzeichnis = Path(settings.upload_dir) / "personen"
    upload_verzeichnis.mkdir(parents=True, exist_ok=True)
    dateiname = f"person-{person.id}{erlaubte_typen[datei.content_type]}"
    (upload_verzeichnis / dateiname).write_bytes(inhalt)

    # Cache-busting-Suffix, damit ein neu hochgeladenes Bild beim selben
    # Dateinamen nicht aus dem Browser-Cache des alten Bilds angezeigt wird.
    person.bild_url = f"/uploads/personen/{dateiname}?v={int(time.time())}"
    await db.commit()
    await db.refresh(person)
    return person
