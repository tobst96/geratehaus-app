from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.buchung import FahrzeugBuchung
from app.models.fahrzeug import Fahrzeug
from app.schemas.buchung import BuchungAnfrage
from app.services import notifier_service
from app.services.config_service import config_service
from app.services.notifier.email import EmailNotifier

AKTIVE_STATUS = ("ausstehend", "genehmigt")

_DETAILS = (
    selectinload(FahrzeugBuchung.fahrzeug),
    selectinload(FahrzeugBuchung.verantwortliche_person),
)


async def _neu_laden(db: AsyncSession, buchung_id: int) -> FahrzeugBuchung:
    result = await db.execute(
        select(FahrzeugBuchung).options(*_DETAILS).where(FahrzeugBuchung.id == buchung_id)
    )
    return result.scalar_one()


async def liste_buchungen(
    db: AsyncSession, von: datetime | None = None, bis: datetime | None = None
) -> list[FahrzeugBuchung]:
    stmt = select(FahrzeugBuchung).options(*_DETAILS)
    if von is not None:
        stmt = stmt.where(FahrzeugBuchung.bis >= von)
    if bis is not None:
        stmt = stmt.where(FahrzeugBuchung.von <= bis)
    stmt = stmt.order_by(FahrzeugBuchung.von)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_buchung(db: AsyncSession, buchung_id: int) -> FahrzeugBuchung | None:
    result = await db.execute(
        select(FahrzeugBuchung).options(*_DETAILS).where(FahrzeugBuchung.id == buchung_id)
    )
    return result.scalar_one_or_none()


async def hat_konflikt(db: AsyncSession, fahrzeug_id: int, von: datetime, bis: datetime) -> bool:
    stmt = select(FahrzeugBuchung).where(
        FahrzeugBuchung.fahrzeug_id == fahrzeug_id,
        FahrzeugBuchung.status.in_(AKTIVE_STATUS),
        FahrzeugBuchung.von < bis,
        FahrzeugBuchung.bis > von,
    )
    result = await db.execute(stmt)
    return result.first() is not None


async def ist_buchbar(db: AsyncSession, fahrzeug_id: int) -> bool:
    result = await db.execute(select(Fahrzeug).where(Fahrzeug.id == fahrzeug_id))
    fahrzeug = result.scalar_one_or_none()
    return fahrzeug is not None and fahrzeug.aktiv and fahrzeug.buchbar


async def anfrage_erstellen(
    db: AsyncSession, person_id: int, daten: BuchungAnfrage
) -> tuple[FahrzeugBuchung, bool]:
    """Legt die Anfrage trotz möglichem Konflikt an (Anfrage bleibt möglich,
    der Moderator entscheidet bei Konflikten – siehe Moderator-Bereich)."""
    konflikt = await hat_konflikt(db, daten.fahrzeug_id, daten.von, daten.bis)
    buchung = FahrzeugBuchung(
        fahrzeug_id=daten.fahrzeug_id,
        von=daten.von,
        bis=daten.bis,
        zweck=daten.zweck,
        verantwortliche_person_id=person_id,
        status="ausstehend",
        hat_konflikt=konflikt,
    )
    db.add(buchung)
    await db.commit()

    fahrzeug_result = await db.execute(select(Fahrzeug).where(Fahrzeug.id == daten.fahrzeug_id))
    fahrzeug = fahrzeug_result.scalar_one_or_none()
    await notifier_service.benachrichtige(
        db,
        "benachrichtigung_buchungsanfrage",
        fahrzeug=fahrzeug.name if fahrzeug else "?",
        von=daten.von.isoformat(),
        bis=daten.bis.isoformat(),
        zweck=daten.zweck,
    )
    return await _neu_laden(db, buchung.id), konflikt


async def zurueckziehen(db: AsyncSession, buchung: FahrzeugBuchung) -> FahrzeugBuchung:
    buchung.status = "zurueckgezogen"
    await db.commit()
    return await _neu_laden(db, buchung.id)


async def konfliktvergleich(db: AsyncSession, buchung: FahrzeugBuchung) -> list[FahrzeugBuchung]:
    """Andere aktive Buchungen desselben Fahrzeugs, die sich mit dieser
    Anfrage zeitlich überschneiden – Entscheidungsgrundlage für den Moderator."""
    stmt = select(FahrzeugBuchung).options(*_DETAILS).where(
        FahrzeugBuchung.id != buchung.id,
        FahrzeugBuchung.fahrzeug_id == buchung.fahrzeug_id,
        FahrzeugBuchung.status.in_(AKTIVE_STATUS),
        FahrzeugBuchung.von < buchung.bis,
        FahrzeugBuchung.bis > buchung.von,
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def genehmigen(db: AsyncSession, buchung: FahrzeugBuchung) -> FahrzeugBuchung:
    buchung.status = "genehmigt"
    buchung.ablehnungsgrund = None
    await db.commit()
    buchung = await _neu_laden(db, buchung.id)
    await _rueckmeldung_per_email(db, buchung, genehmigt=True)
    return buchung


async def ablehnen(db: AsyncSession, buchung: FahrzeugBuchung, grund: str | None) -> FahrzeugBuchung:
    buchung.status = "abgelehnt"
    buchung.ablehnungsgrund = grund
    await db.commit()
    buchung = await _neu_laden(db, buchung.id)
    await _rueckmeldung_per_email(db, buchung, genehmigt=False)
    return buchung


async def _rueckmeldung_per_email(db: AsyncSession, buchung: FahrzeugBuchung, genehmigt: bool) -> None:
    """Schickt der anfragenden Person eine individuelle Rückmeldung, ob ihre
    Fahrzeugbuchung genehmigt oder abgelehnt wurde – unabhängig von der
    global konfigurierten Empfängerliste der übrigen Benachrichtigungen."""
    person = buchung.verantwortliche_person
    if not person or not person.email:
        return
    if not await config_service.get(db, "notifier_email_aktiv", False):
        return

    schluessel = (
        "benachrichtigung_text_buchung_genehmigt"
        if genehmigt
        else "benachrichtigung_text_buchung_abgelehnt"
    )
    vorlage = await config_service.get(db, schluessel, "")
    platzhalter = {
        "fahrzeug": buchung.fahrzeug.name if buchung.fahrzeug else "?",
        "von": buchung.von.strftime("%d.%m.%Y %H:%M"),
        "bis": buchung.bis.strftime("%d.%m.%Y %H:%M"),
        "zweck": buchung.zweck,
        "grund": buchung.ablehnungsgrund or "",
    }
    try:
        nachricht = vorlage.format(**platzhalter)
    except (KeyError, IndexError):
        nachricht = vorlage

    betreff = "Fahrzeugbuchung genehmigt" if genehmigt else "Fahrzeugbuchung abgelehnt"
    await EmailNotifier().send_an(db, person.email, betreff, nachricht)
