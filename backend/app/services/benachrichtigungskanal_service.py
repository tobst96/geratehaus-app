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
from app.models.person import Person
from app.models.person_ereignis_abo import PersonEreignisAbo


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


@dataclass(frozen=True)
class EreignisTyp:
    key: str
    label: str


# Abonnierbare Ereignistypen (Keys == config-/notifier-Schlüssel). Neue Ereignisse
# hier ergänzen.
EREIGNIS_TYPEN: list[EreignisTyp] = [
    EreignisTyp("benachrichtigung_neuer_einsatz", "Einsatz abgeschlossen"),
    EreignisTyp("benachrichtigung_divera_alarm", "Neuer Einsatz (Divera-Alarm)"),
    EreignisTyp("benachrichtigung_neues_dienstbuch", "Neues Dienstbuch"),
    EreignisTyp("benachrichtigung_buchungsanfrage", "Neue Buchungsanfrage"),
    EreignisTyp("benachrichtigung_schwellenwert_ueberschreitung", "Dienststunden-Schwellenwert"),
    EreignisTyp("benachrichtigung_person_inaktiv", "Person inaktiv / wird gelöscht"),
]

_ERLAUBTE_EREIGNISSE = {e.key for e in EREIGNIS_TYPEN}


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


# --- Ereignis-Abos pro Person -------------------------------------------------


async def abos_fuer_person(db: AsyncSession, person_id: int) -> list[str]:
    result = await db.execute(
        select(PersonEreignisAbo.ereignis).where(PersonEreignisAbo.person_id == person_id)
    )
    return list(result.scalars().all())


async def set_abo(db: AsyncSession, person_id: int, ereignis: str, aktiv: bool) -> bool:
    """Abonniert/deabonniert ein Ereignis für eine Person. False bei unbekanntem
    Ereignistyp."""
    if ereignis not in _ERLAUBTE_EREIGNISSE:
        return False
    vorhanden = (
        await db.execute(
            select(PersonEreignisAbo).where(
                PersonEreignisAbo.person_id == person_id,
                PersonEreignisAbo.ereignis == ereignis,
            )
        )
    ).scalar_one_or_none()
    if aktiv and vorhanden is None:
        db.add(PersonEreignisAbo(person_id=person_id, ereignis=ereignis))
        await db.commit()
    elif not aktiv and vorhanden is not None:
        await db.delete(vorhanden)
        await db.commit()
    return True


async def empfaenger_fuer_ereignis(
    db: AsyncSession, ereignis: str
) -> list[tuple[Person, list[Benachrichtigungskanal]]]:
    """Alle (Person, aktive Kanäle) für ein Ereignis: Personen, die das Ereignis
    abonniert haben UND mindestens einen aktiven Kanal mit Zielwert besitzen."""
    person_ids = set(
        (
            await db.execute(
                select(PersonEreignisAbo.person_id).where(PersonEreignisAbo.ereignis == ereignis)
            )
        )
        .scalars()
        .all()
    )
    if not person_ids:
        return []

    kanaele = (
        await db.execute(
            select(Benachrichtigungskanal).where(
                Benachrichtigungskanal.person_id.in_(person_ids),
                Benachrichtigungskanal.aktiv.is_(True),
            )
        )
    ).scalars().all()
    kanaele_je_person: dict[int, list[Benachrichtigungskanal]] = {}
    for k in kanaele:
        if k.zielwert.strip():
            kanaele_je_person.setdefault(k.person_id, []).append(k)
    if not kanaele_je_person:
        return []

    personen = (
        await db.execute(select(Person).where(Person.id.in_(kanaele_je_person.keys())))
    ).scalars().all()
    return [(p, kanaele_je_person[p.id]) for p in personen]


async def mail_empfaenger_fuer_ereignis(db: AsyncSession, ereignis: str) -> list[str]:
    """Nur die E-Mail-Zielwerte der Abonnenten eines Ereignisses (aktiver Mail-Kanal).
    Für den PDF-Versand bei Einsatz-/Dienstbuch-Abschluss – geht damit nur an die
    Personen, die das Ereignis bei sich abonniert haben."""
    adressen: list[str] = []
    for _person, kanaele in await empfaenger_fuer_ereignis(db, ereignis):
        for k in kanaele:
            if k.typ == "mail" and k.zielwert.strip():
                adressen.append(k.zielwert.strip())
    return adressen
