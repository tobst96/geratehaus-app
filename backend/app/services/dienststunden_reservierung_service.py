import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.dienststunden import Dienststunden
from app.models.dienststunden_reservierung import DienststundenReservierung
from app.schemas.dienststunden import DienststundenErfassen
from app.schemas.dienststunden_reservierung import DienststundenReservierungEinloesen
from app.services import dienststunden_service, stammdaten_service

GUELTIGKEIT_MINUTEN = 30


async def reservierung_anlegen(db: AsyncSession) -> DienststundenReservierung:
    jetzt = datetime.now(timezone.utc)
    reservierung = DienststundenReservierung(
        token=secrets.token_urlsafe(16),
        erstellt_am=jetzt,
        ablauf_am=jetzt + timedelta(minutes=GUELTIGKEIT_MINUTEN),
        eingeloest=False,
    )
    db.add(reservierung)
    await db.commit()
    await db.refresh(reservierung)
    return reservierung


async def get_reservierung_by_token(db: AsyncSession, token: str) -> DienststundenReservierung | None:
    result = await db.execute(
        select(DienststundenReservierung).where(DienststundenReservierung.token == token)
    )
    return result.scalar_one_or_none()


def ist_abgelaufen(reservierung: DienststundenReservierung) -> bool:
    ablauf = reservierung.ablauf_am
    if ablauf.tzinfo is None:
        ablauf = ablauf.replace(tzinfo=timezone.utc)
    return ablauf < datetime.now(timezone.utc)


async def reservierung_vorschau_setzen(
    db: AsyncSession, reservierung: DienststundenReservierung, person_id: int, pin: str | None = None
) -> None:
    person = await stammdaten_service.get_person(db, person_id)
    if person is None:
        raise ValueError("Person nicht gefunden.")
    if not stammdaten_service.person_pin_korrekt(person, pin):
        raise PermissionError("PIN falsch oder fehlt.")
    reservierung.vorschau_person_id = person_id
    await db.commit()


async def reservierung_einloesen(
    db: AsyncSession, reservierung: DienststundenReservierung, daten: DienststundenReservierungEinloesen
) -> Dienststunden:
    person = await stammdaten_service.get_person(db, daten.person_id)
    if person is None:
        raise ValueError("Person nicht gefunden.")

    if not await dienststunden_service.funktion_existiert_und_aktiv(db, daten.funktion_id):
        raise ValueError("Funktion nicht gefunden oder inaktiv.")

    eintrag = await dienststunden_service.erfassen(
        db,
        daten.person_id,
        DienststundenErfassen(funktion_id=daten.funktion_id, stunden=daten.stunden, datum=daten.datum),
    )

    reservierung.eingeloest = True
    await db.commit()

    return eintrag
