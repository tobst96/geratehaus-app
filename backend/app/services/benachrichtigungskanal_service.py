"""Benachrichtigungskanäle pro Person (Phase 3).

Erweiterbare Kanal-Registry (`KANAL_TYPEN`) – neue Kanäle (SMS, Push, Slack, …)
hier ergänzen, ohne bestehenden Code umzubauen. CRUD je (person, typ).

Additiv/nicht-brechend: das bestehende Notifier-Routing bleibt in dieser Phase
unverändert; die Verdrahtung dieser Kanäle in den Versand folgt später.
"""

from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.benachrichtigungskanal import Benachrichtigungskanal


@dataclass(frozen=True)
class KanalTyp:
    key: str
    label: str
    zielwert_label: str


KANAL_TYPEN: list[KanalTyp] = [
    KanalTyp("mail", "E-Mail", "E-Mail-Adresse"),
    KanalTyp("telegram", "Telegram", "Chat-ID"),
]

_ERLAUBTE_TYPEN = {k.key for k in KANAL_TYPEN}


async def liste_fuer_person(db: AsyncSession, person_id: int) -> list[Benachrichtigungskanal]:
    result = await db.execute(
        select(Benachrichtigungskanal)
        .where(Benachrichtigungskanal.person_id == person_id)
        .order_by(Benachrichtigungskanal.typ)
    )
    return list(result.scalars().all())


async def setzen(
    db: AsyncSession, person_id: int, typ: str, zielwert: str, aktiv: bool
) -> Benachrichtigungskanal | None:
    """Upsert eines Kanals (ein Kanal je person+typ). Gibt None bei unbekanntem Typ."""
    if typ not in _ERLAUBTE_TYPEN:
        return None
    vorhanden = (
        await db.execute(
            select(Benachrichtigungskanal).where(
                Benachrichtigungskanal.person_id == person_id,
                Benachrichtigungskanal.typ == typ,
            )
        )
    ).scalar_one_or_none()
    if vorhanden is None:
        vorhanden = Benachrichtigungskanal(
            person_id=person_id, typ=typ, zielwert=zielwert, aktiv=aktiv
        )
        db.add(vorhanden)
    else:
        vorhanden.zielwert = zielwert
        vorhanden.aktiv = aktiv
    await db.commit()
    await db.refresh(vorhanden)
    return vorhanden


async def loeschen(db: AsyncSession, person_id: int, typ: str) -> bool:
    kanal = (
        await db.execute(
            select(Benachrichtigungskanal).where(
                Benachrichtigungskanal.person_id == person_id,
                Benachrichtigungskanal.typ == typ,
            )
        )
    ).scalar_one_or_none()
    if kanal is None:
        return False
    await db.delete(kanal)
    await db.commit()
    return True
