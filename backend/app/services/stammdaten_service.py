from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.fahrzeug import Fahrzeug
from app.models.funktion import FunktionDienststunden, FunktionEinsatz
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
