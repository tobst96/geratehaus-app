import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.mitglied_login_reservierung import MitgliedLoginReservierung
from app.services import stammdaten_service

GUELTIGKEIT_MINUTEN = 15


async def reservierung_anlegen(db: AsyncSession) -> MitgliedLoginReservierung:
    jetzt = datetime.now(timezone.utc)
    reservierung = MitgliedLoginReservierung(
        token=secrets.token_urlsafe(16),
        erstellt_am=jetzt,
        ablauf_am=jetzt + timedelta(minutes=GUELTIGKEIT_MINUTEN),
        bestaetigt=False,
        eingeloest=False,
    )
    db.add(reservierung)
    await db.commit()
    await db.refresh(reservierung)
    return reservierung


async def get_reservierung_by_token(db: AsyncSession, token: str) -> MitgliedLoginReservierung | None:
    result = await db.execute(
        select(MitgliedLoginReservierung).where(MitgliedLoginReservierung.token == token)
    )
    return result.scalar_one_or_none()


def ist_abgelaufen(reservierung: MitgliedLoginReservierung) -> bool:
    ablauf = reservierung.ablauf_am
    if ablauf.tzinfo is None:
        ablauf = ablauf.replace(tzinfo=timezone.utc)
    return ablauf < datetime.now(timezone.utc)


async def anmelden(
    db: AsyncSession, reservierung: MitgliedLoginReservierung, person_id: int, pin: str | None
) -> None:
    """Wird vom Handy aus aufgerufen, nachdem die Person sich selbst
    ausgewählt hat (+ PIN, falls für die Person gesetzt)."""
    person = await stammdaten_service.get_person(db, person_id)
    if person is None:
        raise ValueError("Person nicht gefunden.")
    if not stammdaten_service.person_pin_korrekt(person, pin):
        raise PermissionError("PIN falsch oder fehlt.")
    reservierung.person_id = person_id
    reservierung.bestaetigt = True
    await db.commit()
