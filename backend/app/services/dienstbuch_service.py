from datetime import datetime, timedelta, timezone

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.dienstbuch import Dienstbuch, DienstbuchPerson
from app.schemas.dienstbuch import DienstbuchAnlegen, TeilnehmerAktualisieren, TeilnehmerAnlegen
from app.services import notifier_service, pdf_service, stammdaten_service
from app.services.config_service import config_service
from app.services.notifier.email import EmailNotifier

logger = structlog.get_logger(__name__)

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
        .where(
            Dienstbuch.archiviert.is_(False),
            Dienstbuch.geschlossen.is_(False),
            Dienstbuch.eroeffnet_am >= grenze,
        )
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


async def get_teilnehmer(
    db: AsyncSession, dienstbuch_id: int, teilnehmer_id: int
) -> DienstbuchPerson | None:
    result = await db.execute(
        select(DienstbuchPerson)
        .options(selectinload(DienstbuchPerson.person), selectinload(DienstbuchPerson.gruppe))
        .where(DienstbuchPerson.id == teilnehmer_id, DienstbuchPerson.dienstbuch_id == dienstbuch_id)
    )
    return result.scalar_one_or_none()


async def teilnehmer_aktualisieren(
    db: AsyncSession, teilnehmer: DienstbuchPerson, daten: TeilnehmerAktualisieren
) -> DienstbuchPerson:
    """Atemschutzminuten lassen sich erst nach dem Dienst nachtragen – wird
    daher nicht beim Scannen abgefragt, sondern direkt in der Teilnehmerliste
    editiert."""
    teilnehmer.atemschutzminuten = daten.atemschutzminuten
    await db.commit()

    geladen = await get_teilnehmer(db, teilnehmer.dienstbuch_id, teilnehmer.id)
    assert geladen is not None
    return geladen


async def offene_dienstbuecher(db: AsyncSession) -> list[Dienstbuch]:
    """Alle noch nicht geschlossenen Dienstbücher – Grundlage für den
    nächtlichen Autoschluss-Job (unabhängig vom Zeitfenster der Kiosk-Liste)."""
    stmt = (
        select(Dienstbuch).options(*_TEILNEHMER_DETAILS).where(Dienstbuch.geschlossen.is_(False))
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def dienstbuch_schliessen(db: AsyncSession, dienstbuch: Dienstbuch) -> Dienstbuch:
    dienstbuch.geschlossen = True
    await db.commit()
    geladen = await get_dienstbuch(db, dienstbuch.id)
    assert geladen is not None

    grund = f"dienstbuch_{dienstbuch.id}"
    for person_id in {teilnehmer.person_id for teilnehmer in geladen.teilnehmer}:
        await stammdaten_service.punkte_regel_anwenden(
            db, person_id, "dienstbuch", grund=grund, einmalig=True
        )
    await db.commit()

    await _pdf_per_mail_versenden(geladen, db)
    return geladen


async def dienstbuch_wieder_oeffnen(db: AsyncSession, dienstbuch: Dienstbuch) -> Dienstbuch:
    dienstbuch.geschlossen = False
    await db.commit()
    await stammdaten_service.punkte_entfernen(db, f"dienstbuch_{dienstbuch.id}")
    geladen = await get_dienstbuch(db, dienstbuch.id)
    assert geladen is not None
    return geladen


async def _pdf_per_mail_versenden(dienstbuch: Dienstbuch, db: AsyncSession) -> None:
    if not await config_service.get(db, "notifier_email_aktiv", False):
        return
    if not await config_service.get(db, "notifier_email_pdf_bei_dienstbuch_abschluss", False):
        return
    try:
        pdf_inhalt = await pdf_service.dienstbuch_pdf(db, dienstbuch)
        dateiname = f"dienstbuch-{dienstbuch.id}.pdf"
        await EmailNotifier().pdf_versenden(
            db,
            f"Dienstbuch abgeschlossen: {dienstbuch.titel}",
            f"Im Anhang das geschlossene Dienstbuch „{dienstbuch.titel}“.",
            dateiname,
            pdf_inhalt,
        )
    except Exception:
        logger.warning("dienstbuch_pdf_mail_fehlgeschlagen", exc_info=True)
