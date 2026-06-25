import secrets
from datetime import datetime, timedelta, timezone

from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.person import Person
from app.models.person_bild_reservierung import PersonBildReservierung
from app.services import stammdaten_service

GUELTIGKEIT_MINUTEN = 15


async def reservierung_anlegen(db: AsyncSession, person_id: int) -> PersonBildReservierung:
    jetzt = datetime.now(timezone.utc)
    reservierung = PersonBildReservierung(
        token=secrets.token_urlsafe(16),
        person_id=person_id,
        erstellt_am=jetzt,
        ablauf_am=jetzt + timedelta(minutes=GUELTIGKEIT_MINUTEN),
        eingeloest=False,
    )
    db.add(reservierung)
    await db.commit()
    await db.refresh(reservierung)
    return reservierung


async def get_reservierung_by_token(db: AsyncSession, token: str) -> PersonBildReservierung | None:
    result = await db.execute(
        select(PersonBildReservierung).where(PersonBildReservierung.token == token)
    )
    return result.scalar_one_or_none()


def ist_abgelaufen(reservierung: PersonBildReservierung) -> bool:
    ablauf = reservierung.ablauf_am
    if ablauf.tzinfo is None:
        ablauf = ablauf.replace(tzinfo=timezone.utc)
    return ablauf < datetime.now(timezone.utc)


async def reservierung_einloesen(
    db: AsyncSession, reservierung: PersonBildReservierung, datei: UploadFile
) -> Person:
    person = await stammdaten_service.get_person(db, reservierung.person_id)
    if person is None:
        raise ValueError("Person nicht gefunden.")

    person = await stammdaten_service.person_bild_speichern(db, person, datei)

    reservierung.eingeloest = True
    await db.commit()

    return person
