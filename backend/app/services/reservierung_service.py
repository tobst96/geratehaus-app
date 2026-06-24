import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.einsatz import EinsatzPerson
from app.models.person import Person
from app.models.reservierung import SitzplatzReservierung
from app.schemas.einsatz import TeilnahmeAnlegen
from app.schemas.reservierung import ReservierungAnlegen, ReservierungEinloesen
from app.services import einsatz_service

GUELTIGKEIT_MINUTEN = 30


def _voller_name(vorname: str, zwischenname: str | None, nachname: str) -> str:
    teile = [vorname, zwischenname, nachname]
    return " ".join(teil for teil in teile if teil)


async def _get_or_create_person(
    db: AsyncSession, vorname: str, zwischenname: str | None, nachname: str
) -> Person:
    name = _voller_name(vorname, zwischenname, nachname)
    result = await db.execute(select(Person).where(Person.name == name))
    person = result.scalar_one_or_none()
    if person is None:
        person = Person(vorname=vorname, zwischenname=zwischenname, nachname=nachname, name=name)
        db.add(person)
        await db.commit()
        await db.refresh(person)
    return person


async def reservierung_anlegen(
    db: AsyncSession, einsatz_id: int, daten: ReservierungAnlegen
) -> SitzplatzReservierung:
    jetzt = datetime.now(timezone.utc)
    reservierung = SitzplatzReservierung(
        token=secrets.token_urlsafe(16),
        einsatz_id=einsatz_id,
        fahrzeug_id=daten.fahrzeug_id,
        sitzplatz_id=daten.sitzplatz_id,
        bezeichnung=daten.bezeichnung,
        nur_geraetehaus=daten.nur_geraetehaus,
        auf_anfahrt=daten.auf_anfahrt,
        erstellt_am=jetzt,
        ablauf_am=jetzt + timedelta(minutes=GUELTIGKEIT_MINUTEN),
        eingeloest=False,
    )
    db.add(reservierung)
    await db.commit()
    await db.refresh(reservierung)
    return reservierung


async def get_reservierung_by_token(db: AsyncSession, token: str) -> SitzplatzReservierung | None:
    result = await db.execute(select(SitzplatzReservierung).where(SitzplatzReservierung.token == token))
    return result.scalar_one_or_none()


def ist_abgelaufen(reservierung: SitzplatzReservierung) -> bool:
    ablauf = reservierung.ablauf_am
    if ablauf.tzinfo is None:
        ablauf = ablauf.replace(tzinfo=timezone.utc)
    return ablauf < datetime.now(timezone.utc)


async def reservierung_einloesen(
    db: AsyncSession, reservierung: SitzplatzReservierung, daten: ReservierungEinloesen
) -> EinsatzPerson:
    person = await _get_or_create_person(db, daten.vorname, daten.zwischenname, daten.nachname)

    einsatz = await einsatz_service.get_einsatz(db, reservierung.einsatz_id)
    if einsatz is None:
        raise ValueError("Einsatz nicht gefunden.")

    teilnahme_daten = TeilnahmeAnlegen(
        fahrzeug_id=reservierung.fahrzeug_id,
        sitzplatz_id=reservierung.sitzplatz_id,
        funktion_id=None,
        vab=daten.vab,
        atemschutzminuten=daten.atemschutzminuten,
        nur_geraetehaus=reservierung.nur_geraetehaus,
        auf_anfahrt=reservierung.auf_anfahrt,
        ohne_barcode=True,
        bemerkung=daten.bemerkung,
    )
    ergebnis = await einsatz_service.teilnahme_eintragen(db, einsatz, person.id, teilnahme_daten)

    reservierung.eingeloest = True
    await db.commit()

    return ergebnis
