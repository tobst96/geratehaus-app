from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.einsatz_feld import EinsatzFeldDefinition
from app.models.fahrzeug import Fahrzeug
from app.models.funktion import FunktionDienststunden, FunktionEinsatz
from app.schemas.einsatz_feld import (
    EinsatzFeldDefinitionCreate,
    EinsatzFeldDefinitionUpdate,
    schluessel_aus_label,
)
from app.schemas.stammdaten import (
    FahrzeugCreate,
    FahrzeugUpdate,
    FunktionDienststundenCreate,
    FunktionDienststundenUpdate,
    FunktionEinsatzCreate,
    FunktionEinsatzUpdate,
)


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
