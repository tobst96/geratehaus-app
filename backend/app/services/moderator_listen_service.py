"""Gefilterte Listen für den Moderator-Bereich – im Gegensatz zu den
Kameraden-Endpoints werden hier auch archivierte Einträge berücksichtigt."""

from datetime import date, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.buchung import FahrzeugBuchung
from app.models.dienstbuch import Dienstbuch, DienstbuchPerson
from app.models.dienststunden import Dienststunden
from app.models.einsatz import Einsatz, EinsatzPerson

_TEILNAHME_DETAILS = selectinload(Einsatz.teilnahmen).options(
    selectinload(EinsatzPerson.person),
    selectinload(EinsatzPerson.fahrzeug),
    selectinload(EinsatzPerson.funktion),
)
_TEILNEHMER_DETAILS = selectinload(Dienstbuch.teilnehmer).selectinload(DienstbuchPerson.person)


async def einsaetze_liste(
    db: AsyncSession,
    von: datetime | None = None,
    bis: datetime | None = None,
    fahrzeug_id: int | None = None,
    person_id: int | None = None,
    archiviert: bool | None = None,
) -> list[Einsatz]:
    stmt = select(Einsatz).options(_TEILNAHME_DETAILS).distinct()
    if fahrzeug_id is not None or person_id is not None:
        stmt = stmt.join(EinsatzPerson, EinsatzPerson.einsatz_id == Einsatz.id)
        if fahrzeug_id is not None:
            stmt = stmt.where(EinsatzPerson.fahrzeug_id == fahrzeug_id)
        if person_id is not None:
            stmt = stmt.where(EinsatzPerson.person_id == person_id)
    if von is not None:
        stmt = stmt.where(Einsatz.zeitpunkt >= von)
    if bis is not None:
        stmt = stmt.where(Einsatz.zeitpunkt <= bis)
    if archiviert is not None:
        stmt = stmt.where(Einsatz.archiviert.is_(archiviert))
    stmt = stmt.order_by(Einsatz.zeitpunkt.desc())
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def dienstbuecher_liste(
    db: AsyncSession,
    von: datetime | None = None,
    bis: datetime | None = None,
    person_id: int | None = None,
    archiviert: bool | None = None,
) -> list[Dienstbuch]:
    stmt = select(Dienstbuch).options(_TEILNEHMER_DETAILS).distinct()
    if person_id is not None:
        stmt = stmt.join(
            DienstbuchPerson, DienstbuchPerson.dienstbuch_id == Dienstbuch.id
        ).where(DienstbuchPerson.person_id == person_id)
    if von is not None:
        stmt = stmt.where(Dienstbuch.eroeffnet_am >= von)
    if bis is not None:
        stmt = stmt.where(Dienstbuch.eroeffnet_am <= bis)
    if archiviert is not None:
        stmt = stmt.where(Dienstbuch.archiviert.is_(archiviert))
    stmt = stmt.order_by(Dienstbuch.eroeffnet_am.desc())
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def dienststunden_liste(
    db: AsyncSession,
    von: date | None = None,
    bis: date | None = None,
    person_id: int | None = None,
    funktion_id: int | None = None,
) -> list[Dienststunden]:
    stmt = select(Dienststunden).options(
        selectinload(Dienststunden.person), selectinload(Dienststunden.funktion)
    )
    if von is not None:
        stmt = stmt.where(Dienststunden.datum >= von)
    if bis is not None:
        stmt = stmt.where(Dienststunden.datum <= bis)
    if person_id is not None:
        stmt = stmt.where(Dienststunden.person_id == person_id)
    if funktion_id is not None:
        stmt = stmt.where(Dienststunden.funktion_id == funktion_id)
    stmt = stmt.order_by(Dienststunden.datum.desc())
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def buchungen_liste(
    db: AsyncSession,
    von: datetime | None = None,
    bis: datetime | None = None,
    fahrzeug_id: int | None = None,
    person_id: int | None = None,
    status: str | None = None,
) -> list[FahrzeugBuchung]:
    stmt = select(FahrzeugBuchung).options(
        selectinload(FahrzeugBuchung.fahrzeug), selectinload(FahrzeugBuchung.verantwortliche_person)
    )
    if von is not None:
        stmt = stmt.where(FahrzeugBuchung.bis >= von)
    if bis is not None:
        stmt = stmt.where(FahrzeugBuchung.von <= bis)
    if fahrzeug_id is not None:
        stmt = stmt.where(FahrzeugBuchung.fahrzeug_id == fahrzeug_id)
    if person_id is not None:
        stmt = stmt.where(FahrzeugBuchung.verantwortliche_person_id == person_id)
    if status is not None:
        stmt = stmt.where(FahrzeugBuchung.status == status)
    stmt = stmt.order_by(FahrzeugBuchung.von.desc())
    result = await db.execute(stmt)
    return list(result.scalars().all())
