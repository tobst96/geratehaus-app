import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.dienstbuch import DienstbuchPerson
from app.models.dienstbuch_reservierung import DienstbuchReservierung
from app.schemas.dienstbuch import TeilnehmerAnlegen
from app.schemas.dienstbuch_reservierung import DienstbuchReservierungEinloesen
from app.services import dienstbuch_service, stammdaten_service

GUELTIGKEIT_MINUTEN = 30


async def reservierung_anlegen(db: AsyncSession, dienstbuch_id: int) -> DienstbuchReservierung:
    jetzt = datetime.now(timezone.utc)
    reservierung = DienstbuchReservierung(
        token=secrets.token_urlsafe(16),
        dienstbuch_id=dienstbuch_id,
        erstellt_am=jetzt,
        ablauf_am=jetzt + timedelta(minutes=GUELTIGKEIT_MINUTEN),
        eingeloest=False,
    )
    db.add(reservierung)
    await db.commit()
    await db.refresh(reservierung)
    return reservierung


async def get_reservierung_by_token(db: AsyncSession, token: str) -> DienstbuchReservierung | None:
    result = await db.execute(
        select(DienstbuchReservierung).where(DienstbuchReservierung.token == token)
    )
    return result.scalar_one_or_none()


def ist_abgelaufen(reservierung: DienstbuchReservierung) -> bool:
    ablauf = reservierung.ablauf_am
    if ablauf.tzinfo is None:
        ablauf = ablauf.replace(tzinfo=timezone.utc)
    return ablauf < datetime.now(timezone.utc)


async def reservierung_vorschau_setzen(
    db: AsyncSession, reservierung: DienstbuchReservierung, person_id: int, pin: str | None = None
) -> None:
    person = await stammdaten_service.get_person(db, person_id)
    if person is None:
        raise ValueError("Person nicht gefunden.")
    if not stammdaten_service.person_pin_korrekt(person, pin):
        raise PermissionError("PIN falsch oder fehlt.")
    reservierung.vorschau_person_id = person_id
    await db.commit()


async def reservierung_einloesen(
    db: AsyncSession, reservierung: DienstbuchReservierung, daten: DienstbuchReservierungEinloesen
) -> DienstbuchPerson:
    person = await stammdaten_service.get_person(db, daten.person_id)
    if person is None:
        raise ValueError("Person nicht gefunden.")

    dienstbuch = await dienstbuch_service.get_dienstbuch(db, reservierung.dienstbuch_id)
    if dienstbuch is None:
        raise ValueError("Dienstbuch nicht gefunden.")

    teilnehmer_daten = TeilnehmerAnlegen(gruppe_id=daten.gruppe_id, atemschutzminuten=0)
    ergebnis = await dienstbuch_service.teilnehmer_eintragen(db, dienstbuch, person.id, teilnehmer_daten)

    reservierung.eingeloest = True
    await db.commit()

    return ergebnis
