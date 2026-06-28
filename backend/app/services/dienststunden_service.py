import structlog
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.dienststunden import Dienststunden
from app.models.dienststunden_uebernahme import DienststundenUebernahme
from app.models.funktion import FunktionDienststunden
from app.models.person import Person
from app.schemas.dienststunden import (
    DienststundenEintragOut,
    DienststundenErfassen,
    DienststundenSummeOut,
    SchwellenwertEintragOut,
)
from app.services import notifier_service, stammdaten_service

logger = structlog.get_logger(__name__)


async def funktion_existiert_und_aktiv(db: AsyncSession, funktion_id: int) -> bool:
    result = await db.execute(
        select(FunktionDienststunden).where(
            FunktionDienststunden.id == funktion_id, FunktionDienststunden.aktiv.is_(True)
        )
    )
    return result.scalar_one_or_none() is not None


async def erfassen(db: AsyncSession, person_id: int, daten: DienststundenErfassen) -> DienststundenEintragOut:
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
    await _stunden_mail_senden(db, person_id, daten.funktion_id, eintrag.stunden, str(daten.datum))

    person_result = await db.execute(select(Person).where(Person.id == person_id))
    person = person_result.scalar_one_or_none()
    funktion_result = await db.execute(
        select(FunktionDienststunden).where(FunktionDienststunden.id == daten.funktion_id)
    )
    funktion = funktion_result.scalar_one_or_none()
    return DienststundenEintragOut(
        id=eintrag.id,
        person_id=person_id,
        person_name=person.name if person else "?",
        funktion_id=daten.funktion_id,
        funktion_name=funktion.name if funktion else "?",
        stunden=eintrag.stunden,
        datum=eintrag.datum,
    )


async def _stunden_mail_senden(
    db: AsyncSession, person_id: int, funktion_id: int, stunden: float, datum: str
) -> None:
    from app.services.notifier.email import EmailNotifier
    from app.services.config_service import config_service

    if not await config_service.get(db, "notifier_email_aktiv", False):
        return
    person_result = await db.execute(select(Person).where(Person.id == person_id))
    person = person_result.scalar_one_or_none()
    if person is None or not person.email or not person.benachrichtigungen_aktiv:
        return
    funktion_result = await db.execute(
        select(FunktionDienststunden).where(FunktionDienststunden.id == funktion_id)
    )
    funktion = funktion_result.scalar_one_or_none()
    funktion_name = funktion.name if funktion else "?"
    stunden_str = str(int(stunden)) if stunden == int(stunden) else f"{stunden:.1f}"
    try:
        await EmailNotifier().send_an(
            db,
            empfaenger=person.email,
            betreff="Dienststunden eingetragen",
            nachricht=(
                f"Hallo {person.name},\n\n"
                f"deine Dienststunden wurden eingetragen: {stunden_str} Stunden"
                f" als {funktion_name} am {datum}.\n\n"
                f"Schöne Grüße"
            ),
        )
    except Exception:
        logger.warning("dienststunden_mail_fehlgeschlagen", person_id=person_id, exc_info=True)


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


async def schwellenwert_liste(db: AsyncSession) -> list[SchwellenwertEintragOut]:
    """Personen, die den Schwellenwert einer Funktion auch nach Abzug bereits
    übernommener Stunden noch überschreiten – für die Liste unter
    Listen > Dienststunden im Moderator-Bereich."""
    summen_stmt = (
        select(
            Person.id,
            Person.name,
            FunktionDienststunden.id,
            FunktionDienststunden.name,
            func.sum(Dienststunden.stunden),
            FunktionDienststunden.schwellenwert_stunden,
        )
        .join(Dienststunden, Dienststunden.person_id == Person.id)
        .join(FunktionDienststunden, FunktionDienststunden.id == Dienststunden.funktion_id)
        .where(FunktionDienststunden.aktiv.is_(True), FunktionDienststunden.schwellenwert_stunden > 0)
        .group_by(
            Person.id, Person.name, FunktionDienststunden.id, FunktionDienststunden.name,
            FunktionDienststunden.schwellenwert_stunden,
        )
    )
    summen_result = await db.execute(summen_stmt)
    summen = summen_result.all()
    if not summen:
        return []

    uebernahmen_stmt = (
        select(
            DienststundenUebernahme.person_id,
            DienststundenUebernahme.funktion_id,
            func.sum(DienststundenUebernahme.stunden),
        ).group_by(DienststundenUebernahme.person_id, DienststundenUebernahme.funktion_id)
    )
    uebernahmen_result = await db.execute(uebernahmen_stmt)
    uebernommen_je_paar = {(pid, fid): summe for pid, fid, summe in uebernahmen_result.all()}

    eintraege = []
    for pid, pname, fid, fname, summe, schwellenwert in summen:
        uebernommen = uebernommen_je_paar.get((pid, fid), 0.0)
        ueberschuss = summe - schwellenwert - uebernommen
        if ueberschuss <= 0:
            continue
        eintraege.append(
            SchwellenwertEintragOut(
                person_id=pid,
                person_name=pname,
                funktion_id=fid,
                funktion_name=fname,
                summe_stunden=summe,
                schwellenwert_stunden=schwellenwert,
                uebernommen_stunden=uebernommen,
                ueberschuss_stunden=ueberschuss,
            )
        )
    eintraege.sort(key=lambda e: e.ueberschuss_stunden, reverse=True)
    return eintraege


async def uebernahme_eintragen(
    db: AsyncSession, person_id: int, funktion_id: int, stunden: float
) -> DienststundenUebernahme:
    uebernahme = DienststundenUebernahme(person_id=person_id, funktion_id=funktion_id, stunden=stunden)
    db.add(uebernahme)
    await db.commit()
    await db.refresh(uebernahme)
    return uebernahme
