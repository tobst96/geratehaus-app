from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.dienstbuch import Dienstbuch, DienstbuchPerson
from app.schemas.dienstbuch import DienstbuchAnlegen, TeilnehmerAnlegen
from app.services import notifier_service
from app.services.config_service import config_service

_TEILNEHMER_DETAILS = (
    selectinload(Dienstbuch.teilnehmer).selectinload(DienstbuchPerson.person),
    selectinload(Dienstbuch.teilnehmer).selectinload(DienstbuchPerson.gruppe),
)


async def letzte_dienstbuecher(db: AsyncSession) -> list[Dienstbuch]:
    """Dienstbücher innerhalb des konfigurierten Zeitfensters (Default 12h)."""
    zeitfenster_stunden = await config_service.get(db, "dienstbuch_zeitfenster_stunden", 12)
    grenze = datetime.now(timezone.utc) - timedelta(hours=zeitfenster_stunden)
    stmt = (
        select(Dienstbuch)
        .options(*_TEILNEHMER_DETAILS)
        .where(Dienstbuch.archiviert.is_(False), Dienstbuch.eroeffnet_am >= grenze)
        .order_by(Dienstbuch.eroeffnet_am.desc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_dienstbuch(db: AsyncSession, dienstbuch_id: int) -> Dienstbuch | None:
    stmt = select(Dienstbuch).options(*_TEILNEHMER_DETAILS).where(Dienstbuch.id == dienstbuch_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def dienstbuch_anlegen(db: AsyncSession, daten: DienstbuchAnlegen) -> Dienstbuch:
    dienstbuch = Dienstbuch(
        titel=daten.titel, eroeffnet_am=daten.eroeffnet_am, notizen=daten.notizen
    )
    db.add(dienstbuch)
    await db.commit()
    await notifier_service.benachrichtige(
        db, "benachrichtigung_neues_dienstbuch", titel=dienstbuch.titel
    )
    geladen = await get_dienstbuch(db, dienstbuch.id)
    assert geladen is not None
    return geladen


async def teilnehmer_eintragen(
    db: AsyncSession, dienstbuch: Dienstbuch, person_id: int, daten: TeilnehmerAnlegen
) -> DienstbuchPerson:
    stmt = select(DienstbuchPerson).where(
        DienstbuchPerson.dienstbuch_id == dienstbuch.id,
        DienstbuchPerson.person_id == person_id,
    )
    result = await db.execute(stmt)
    teilnehmer = result.scalar_one_or_none()
    if teilnehmer is None:
        teilnehmer = DienstbuchPerson(dienstbuch_id=dienstbuch.id, person_id=person_id)
        db.add(teilnehmer)

    teilnehmer.gruppe_id = daten.gruppe_id
    teilnehmer.atemschutzminuten = daten.atemschutzminuten
    await db.commit()

    geladen = await db.execute(
        select(DienstbuchPerson)
        .options(selectinload(DienstbuchPerson.person), selectinload(DienstbuchPerson.gruppe))
        .where(DienstbuchPerson.dienstbuch_id == dienstbuch.id, DienstbuchPerson.person_id == person_id)
    )
    return geladen.scalar_one()
