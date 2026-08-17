"""Aggregiert die eigenen Daten einer Person fürs persönliche Dashboard."""

from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.dienstbuch import Dienstbuch, DienstbuchPerson
from app.models.einsatz import Einsatz, EinsatzPerson
from app.schemas.mitglied import MeinEinsatzKurz, MitgliedUebersicht
from app.services import dienststunden_service


async def uebersicht(db: AsyncSession, person_id: int) -> MitgliedUebersicht:
    jahr = datetime.now(timezone.utc).year

    einsaetze_jahr = (
        await db.execute(
            select(func.count())
            .select_from(EinsatzPerson)
            .join(Einsatz, Einsatz.id == EinsatzPerson.einsatz_id)
            .where(
                EinsatzPerson.person_id == person_id,
                func.extract("year", Einsatz.zeitpunkt) == jahr,
            )
        )
    ).scalar_one()

    dienste_jahr = (
        await db.execute(
            select(func.count())
            .select_from(DienstbuchPerson)
            .join(Dienstbuch, Dienstbuch.id == DienstbuchPerson.dienstbuch_id)
            .where(
                DienstbuchPerson.person_id == person_id,
                func.extract("year", Dienstbuch.eroeffnet_am) == jahr,
            )
        )
    ).scalar_one()

    dienststunden = await dienststunden_service.eigene_summen(db, person_id)

    letzte_rows = (
        await db.execute(
            select(Einsatz.id, Einsatz.titel, Einsatz.zeitpunkt)
            .join(EinsatzPerson, EinsatzPerson.einsatz_id == Einsatz.id)
            .where(EinsatzPerson.person_id == person_id)
            .order_by(Einsatz.zeitpunkt.desc())
            .limit(5)
        )
    ).all()
    letzte_einsaetze = [
        MeinEinsatzKurz(id=r.id, titel=r.titel, zeitpunkt=r.zeitpunkt) for r in letzte_rows
    ]

    return MitgliedUebersicht(
        einsaetze_jahr=einsaetze_jahr,
        dienste_jahr=dienste_jahr,
        dienststunden=dienststunden,
        letzte_einsaetze=letzte_einsaetze,
    )
