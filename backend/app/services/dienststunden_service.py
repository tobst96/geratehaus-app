from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.dienststunden import Dienststunden
from app.models.funktion import FunktionDienststunden
from app.models.person import Person
from app.schemas.dienststunden import DienststundenErfassen, DienststundenSummeOut
from app.services import notifier_service, stammdaten_service


async def funktion_existiert_und_aktiv(db: AsyncSession, funktion_id: int) -> bool:
    result = await db.execute(
        select(FunktionDienststunden).where(
            FunktionDienststunden.id == funktion_id, FunktionDienststunden.aktiv.is_(True)
        )
    )
    return result.scalar_one_or_none() is not None


async def erfassen(db: AsyncSession, person_id: int, daten: DienststundenErfassen) -> Dienststunden:
    eintrag = Dienststunden(
        person_id=person_id,
        funktion_id=daten.funktion_id,
        stunden=daten.stunden,
        datum=daten.datum,
    )
    db.add(eintrag)
    await _funktion_in_stammdaten_abgleichen(db, person_id, daten.funktion_id)
    await db.commit()
    await db.refresh(eintrag)
    await _pruefe_schwellenwert(db, person_id, daten.funktion_id, eintrag.stunden)
    # Punkte je Stunde, präzise anteilig (z. B. 1,5 Std. = 1,5-facher Wert,
    # also auch auf die Minute genau berücksichtigt).
    await stammdaten_service.punkte_regel_anwenden(db, person_id, "dienststunden", faktor=eintrag.stunden)
    await db.commit()
    return eintrag


async def _funktion_in_stammdaten_abgleichen(
    db: AsyncSession, person_id: int, funktion_id: int
) -> None:
    """Übernimmt die bei der Erfassung gewählte Funktion als neue Default-Funktion
    der Person in den Stammdaten, sofern sie abweicht, und protokolliert die
    Änderung in der Timeline der Person."""
    person_result = await db.execute(select(Person).where(Person.id == person_id))
    person = person_result.scalar_one_or_none()
    if person is None or person.funktion_id == funktion_id:
        return

    alte_funktion_id = person.funktion_id
    person.funktion_id = funktion_id

    if alte_funktion_id is not None:
        funktion_result = await db.execute(
            select(FunktionDienststunden).where(FunktionDienststunden.id == funktion_id)
        )
        neue_funktion = funktion_result.scalar_one_or_none()
        await stammdaten_service.person_ereignis_protokollieren(
            db,
            person_id,
            "funktion_geaendert",
            f"Funktion durch Dienststunden-Erfassung geändert auf "
            f"„{neue_funktion.name if neue_funktion else '?'}“",
        )


async def _pruefe_schwellenwert(
    db: AsyncSession, person_id: int, funktion_id: int, neue_stunden: float
) -> None:
    """Benachrichtigt, wenn diese Erfassung den Schwellenwert der Funktion
    erstmals überschreitet (nicht bei jeder weiteren Erfassung danach)."""
    funktion_result = await db.execute(
        select(FunktionDienststunden).where(FunktionDienststunden.id == funktion_id)
    )
    funktion = funktion_result.scalar_one_or_none()
    if funktion is None or not funktion.schwellenwert_stunden:
        return

    summe_result = await db.execute(
        select(func.coalesce(func.sum(Dienststunden.stunden), 0.0)).where(
            Dienststunden.person_id == person_id, Dienststunden.funktion_id == funktion_id
        )
    )
    summe = summe_result.scalar_one()
    summe_vorher = summe - neue_stunden
    if summe_vorher >= funktion.schwellenwert_stunden or summe < funktion.schwellenwert_stunden:
        return

    person_result = await db.execute(select(Person).where(Person.id == person_id))
    person = person_result.scalar_one_or_none()
    await notifier_service.benachrichtige(
        db,
        "benachrichtigung_schwellenwert_ueberschreitung",
        person=person.name if person else "?",
        funktion=funktion.name,
        summe=round(summe, 2),
        schwellenwert=funktion.schwellenwert_stunden,
    )


async def eigene_eintraege(db: AsyncSession, person_id: int) -> list[Dienststunden]:
    stmt = (
        select(Dienststunden)
        .where(Dienststunden.person_id == person_id)
        .order_by(Dienststunden.datum.desc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def eigene_summen(db: AsyncSession, person_id: int) -> list[DienststundenSummeOut]:
    """Kumulierte Stunden pro Funktion inkl. Schwellenwert-Vergleich."""
    stmt = (
        select(
            FunktionDienststunden.id,
            FunktionDienststunden.name,
            FunktionDienststunden.schwellenwert_stunden,
            func.coalesce(func.sum(Dienststunden.stunden), 0.0),
        )
        .outerjoin(
            Dienststunden,
            (Dienststunden.funktion_id == FunktionDienststunden.id)
            & (Dienststunden.person_id == person_id),
        )
        .where(FunktionDienststunden.aktiv.is_(True))
        .group_by(FunktionDienststunden.id, FunktionDienststunden.name, FunktionDienststunden.schwellenwert_stunden)
        .order_by(FunktionDienststunden.name)
    )
    result = await db.execute(stmt)
    return [
        DienststundenSummeOut(
            funktion_id=funktion_id,
            funktion_name=name,
            summe_stunden=summe,
            schwellenwert_stunden=schwellenwert,
            schwellenwert_ueberschritten=summe >= schwellenwert if schwellenwert else False,
        )
        for funktion_id, name, schwellenwert, summe in result.all()
    ]
