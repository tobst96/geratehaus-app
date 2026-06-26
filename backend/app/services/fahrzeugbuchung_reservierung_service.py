import secrets
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.buchung import FahrzeugBuchung
from app.models.fahrzeugbuchung_reservierung import FahrzeugbuchungReservierung
from app.schemas.buchung import BuchungAnfrage
from app.schemas.fahrzeugbuchung_reservierung import FahrzeugbuchungReservierungEinloesen
from app.services import buchung_service, stammdaten_service

GUELTIGKEIT_MINUTEN = 30


async def reservierung_anlegen(db: AsyncSession) -> FahrzeugbuchungReservierung:
    jetzt = datetime.now(timezone.utc)
    reservierung = FahrzeugbuchungReservierung(
        token=secrets.token_urlsafe(16),
        erstellt_am=jetzt,
        ablauf_am=jetzt + timedelta(minutes=GUELTIGKEIT_MINUTEN),
        eingeloest=False,
    )
    db.add(reservierung)
    await db.commit()
    await db.refresh(reservierung)
    return reservierung


async def get_reservierung_by_token(db: AsyncSession, token: str) -> FahrzeugbuchungReservierung | None:
    result = await db.execute(
        select(FahrzeugbuchungReservierung).where(FahrzeugbuchungReservierung.token == token)
    )
    return result.scalar_one_or_none()


def ist_abgelaufen(reservierung: FahrzeugbuchungReservierung) -> bool:
    ablauf = reservierung.ablauf_am
    if ablauf.tzinfo is None:
        ablauf = ablauf.replace(tzinfo=timezone.utc)
    return ablauf < datetime.now(timezone.utc)


async def reservierung_vorschau_setzen(
    db: AsyncSession, reservierung: FahrzeugbuchungReservierung, person_id: int, pin: str | None = None
) -> None:
    person = await stammdaten_service.get_person(db, person_id)
    if person is None:
        raise ValueError("Person nicht gefunden.")
    if not stammdaten_service.person_pin_korrekt(person, pin):
        raise PermissionError("PIN falsch oder fehlt.")
    reservierung.vorschau_person_id = person_id
    await db.commit()


async def reservierung_einloesen(
    db: AsyncSession,
    reservierung: FahrzeugbuchungReservierung,
    daten: FahrzeugbuchungReservierungEinloesen,
) -> FahrzeugBuchung:
    person = await stammdaten_service.get_person(db, daten.person_id)
    if person is None:
        raise ValueError("Person nicht gefunden.")

    if not await buchung_service.ist_buchbar(db, daten.fahrzeug_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Dieses Fahrzeug ist aktuell nicht buchbar."
        )

    buchung, _konflikt = await buchung_service.anfrage_erstellen(
        db,
        daten.person_id,
        BuchungAnfrage(fahrzeug_id=daten.fahrzeug_id, von=daten.von, bis=daten.bis, zweck=daten.zweck),
    )

    reservierung.eingeloest = True
    await db.commit()

    return buchung
