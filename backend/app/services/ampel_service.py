"""Aktivitäts-Ampel für Personal.

Ermittelt je Person das Datum des letzten *relevanten* Eintrags – Teilnahme an
einem Einsatz, an einem Dienstbuch oder eine erfasste Dienststunde – und leitet
daraus einen Ampelstatus ab (gruen/gelb/rot). Es zählen nur Module, die auf der
Instanz **aktiv** sind. Manuell auf `inaktiv` gesetzte Personen sind ausgenommen
(Status "inaktiv", keine Benachrichtigung).

Die Benachrichtigung wird **einmalig beim Überschreiten** einer Schwelle
ausgelöst: `person.ampel_gemeldet` hält die zuletzt gemeldete Stufe, sodass ein
täglicher Job nicht wiederholt meldet. Neue Aktivität setzt die Stufe zurück auf
gruen, wodurch eine erneute Eskalation wieder meldet.
"""

from datetime import datetime, timezone

import structlog
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.dienstbuch import Dienstbuch, DienstbuchPerson
from app.models.dienststunden import Dienststunden
from app.models.einsatz import Einsatz, EinsatzPerson
from app.models.person import Person
from app.schemas.person import AmpelEintragOut
from app.services import notifier_service
from app.services.config_service import config_service

logger = structlog.get_logger(__name__)

STATUS_GRUEN = "gruen"
STATUS_GELB = "gelb"
STATUS_ROT = "rot"
STATUS_INAKTIV = "inaktiv"

# Schwere-Rangfolge für den "nur bei Verschlechterung melden"-Vergleich.
_SCHWERE = {STATUS_GRUEN: 0, STATUS_GELB: 1, STATUS_ROT: 2}


async def _konfig(db: AsyncSession) -> tuple[int, int, bool, bool, bool]:
    gelb = int(await config_service.get(db, "personal_ampel_gelb_tage", 30))
    rot = int(await config_service.get(db, "personal_ampel_rot_tage", 60))
    einsatz = bool(await config_service.get(db, "modul_einsatztagebuch_aktiv", True))
    dienstbuch = bool(await config_service.get(db, "modul_dienstbuch_aktiv", True))
    dienststunden = bool(await config_service.get(db, "modul_dienststunden_aktiv", True))
    return gelb, rot, einsatz, dienstbuch, dienststunden


def _als_utc(dt: datetime) -> datetime:
    return dt if dt.tzinfo is not None else dt.replace(tzinfo=timezone.utc)


async def _letzte_eintraege(
    db: AsyncSession, *, einsatz: bool, dienstbuch: bool, dienststunden: bool
) -> dict[int, datetime]:
    """person_id → jüngstes relevantes Eintragsdatum (UTC-aware) über alle aktiven
    Module. Je Modul genau eine gruppierte Query."""
    letzte: dict[int, datetime] = {}

    def _merge(pid: int, dt: datetime | None) -> None:
        if dt is None:
            return
        dt = _als_utc(dt)
        vorher = letzte.get(pid)
        if vorher is None or dt > vorher:
            letzte[pid] = dt

    if einsatz:
        rows = await db.execute(
            select(EinsatzPerson.person_id, func.max(Einsatz.zeitpunkt))
            .join(Einsatz, Einsatz.id == EinsatzPerson.einsatz_id)
            .group_by(EinsatzPerson.person_id)
        )
        for pid, dt in rows.all():
            _merge(pid, dt)
    if dienstbuch:
        rows = await db.execute(
            select(DienstbuchPerson.person_id, func.max(Dienstbuch.eroeffnet_am))
            .join(Dienstbuch, Dienstbuch.id == DienstbuchPerson.dienstbuch_id)
            .group_by(DienstbuchPerson.person_id)
        )
        for pid, dt in rows.all():
            _merge(pid, dt)
    if dienststunden:
        rows = await db.execute(
            select(Dienststunden.person_id, func.max(Dienststunden.datum)).group_by(
                Dienststunden.person_id
            )
        )
        for pid, d in rows.all():
            if d is not None:
                _merge(pid, datetime(d.year, d.month, d.day, tzinfo=timezone.utc))
    return letzte


def _status(
    person: Person, letzte: datetime | None, jetzt: datetime, gelb: int, rot: int
) -> tuple[str, int]:
    """Status + Tage seit dem letzten Eintrag. Ohne Eintrag zählt das Anlagedatum
    der Person (neue Personen werden nicht sofort rot)."""
    if person.inaktiv:
        return STATUS_INAKTIV, 0
    bezug = _als_utc(letzte or person.erstellt_am)
    tage = max((jetzt - bezug).days, 0)
    if rot > 0 and tage >= rot:
        return STATUS_ROT, tage
    if gelb > 0 and tage >= gelb:
        return STATUS_GELB, tage
    return STATUS_GRUEN, tage


async def _personen(db: AsyncSession) -> list[Person]:
    return list((await db.execute(select(Person))).scalars().all())


async def ampel_uebersicht(db: AsyncSession) -> list[AmpelEintragOut]:
    """Ampelstatus je Person (für die Personal-Liste im Frontend)."""
    gelb, rot, einsatz, dienstbuch, dienststunden = await _konfig(db)
    letzte = await _letzte_eintraege(
        db, einsatz=einsatz, dienstbuch=dienstbuch, dienststunden=dienststunden
    )
    jetzt = datetime.now(timezone.utc)
    ergebnis: list[AmpelEintragOut] = []
    for person in await _personen(db):
        status, tage = _status(person, letzte.get(person.id), jetzt, gelb, rot)
        ergebnis.append(AmpelEintragOut(person_id=person.id, status=status, tage=tage))
    return ergebnis


async def ampel_benachrichtigungen_versenden(db: AsyncSession) -> int:
    """Tagesjob: meldet je Person genau einmal, sobald sie neu die gelbe bzw. rote
    Schwelle überschreitet. Gibt die Anzahl versendeter Meldungen zurück."""
    gelb, rot, einsatz, dienstbuch, dienststunden = await _konfig(db)
    if gelb <= 0 and rot <= 0:
        return 0
    letzte = await _letzte_eintraege(
        db, einsatz=einsatz, dienstbuch=dienstbuch, dienststunden=dienststunden
    )
    jetzt = datetime.now(timezone.utc)
    gesendet = 0
    for person in await _personen(db):
        if person.inaktiv:
            person.ampel_gemeldet = STATUS_GRUEN
            continue
        status, tage = _status(person, letzte.get(person.id), jetzt, gelb, rot)
        vorher = person.ampel_gemeldet if person.ampel_gemeldet in _SCHWERE else STATUS_GRUEN
        if _SCHWERE[status] > _SCHWERE[vorher]:
            ereignis = (
                "benachrichtigung_person_ampel_rot"
                if status == STATUS_ROT
                else "benachrichtigung_person_ampel_gelb"
            )
            await notifier_service.benachrichtige(db, ereignis, name=person.name, tage=tage)
            gesendet += 1
        person.ampel_gemeldet = status
    await db.commit()
    return gesendet
