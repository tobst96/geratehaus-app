"""PIN-Self-Service und Moderator-Freigabe für den Namen+PIN-Login.

Wird gebraucht, wenn das Barcode-Modul AUS ist: Personen ohne gesetzten PIN
fordern über den Kiosk ("PIN anfordern") oder den periodischen Erinnerungs-Job
einen PIN-Setz-Link an.

- Person MIT E-Mail  → `pin_setzen_tokens`-Token + Self-Service-Mail (Link, über
  den die Person ihren PIN selbst setzt).
- Person OHNE E-Mail → `person_freigabe_tokens`-Token + Aktions-Mail an die
  Moderatoren (Freigeben/Ablehnen). "Freigeben" öffnet eine Seite, auf der für
  die Person eine E-Mail (und optional direkt der PIN) gesetzt wird.
"""

import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.person import Person
from app.models.pin_token import PersonFreigabeToken, PinSetzenToken
from app.services import stammdaten_service
from app.services.config_service import config_service
from app.services.notifier.email import EmailNotifier

GUELTIGKEIT_TAGE = 14


def _jetzt() -> datetime:
    return datetime.now(timezone.utc)


def _als_utc(wert: datetime) -> datetime:
    return wert if wert.tzinfo else wert.replace(tzinfo=timezone.utc)


async def _basis_url(db: AsyncSession) -> str:
    return str(await config_service.get(db, "oeffentliche_basis_url", "")).rstrip("/")


# --- PIN-Self-Service-Token -------------------------------------------------


async def pin_setzen_token_erstellen(db: AsyncSession, person_id: int) -> PinSetzenToken:
    token = PinSetzenToken(
        person_id=person_id,
        token=secrets.token_urlsafe(24),
        erstellt_am=_jetzt(),
        ablauf_am=_jetzt() + timedelta(days=GUELTIGKEIT_TAGE),
        eingeloest=False,
    )
    db.add(token)
    await db.commit()
    await db.refresh(token)
    return token


async def get_pin_setzen_token(db: AsyncSession, token: str) -> PinSetzenToken | None:
    result = await db.execute(select(PinSetzenToken).where(PinSetzenToken.token == token))
    return result.scalar_one_or_none()


def pin_setzen_token_gueltig(token: PinSetzenToken) -> bool:
    return not token.eingeloest and _als_utc(token.ablauf_am) > _jetzt()


async def self_service_mail_senden(db: AsyncSession, person: Person) -> bool:
    """Legt einen Self-Service-Token an und schickt der Person den PIN-Setz-Link.
    Voraussetzung: Person hat eine E-Mail. Gibt True zurück, wenn versendet."""
    if not person.email:
        return False
    basis = await _basis_url(db)
    if not basis:
        return False
    token = await pin_setzen_token_erstellen(db, person.id)
    link = f"{basis}/pin-setzen/{token.token}"
    nachricht = (
        f"Hallo {person.name},\n\n"
        "für die Anmeldung am Gerätehaus wird ein persönlicher PIN benötigt. "
        "Über den folgenden Link kannst du deinen PIN selbst setzen:\n\n"
        f"{link}\n\n"
        f"Der Link ist {GUELTIGKEIT_TAGE} Tage gültig."
    )
    await EmailNotifier().send_an(db, person.email, "PIN für Gerätehaus.app setzen", nachricht)
    return True


async def pin_setzen_per_token(db: AsyncSession, token: PinSetzenToken, pin: str) -> Person:
    person = await stammdaten_service.get_person(db, token.person_id)
    if person is None:
        raise ValueError("Person nicht gefunden.")
    await stammdaten_service.person_pin_setzen(db, person, pin)
    token.eingeloest = True
    await db.commit()
    return person


# --- Moderator-Freigabe (Person ohne E-Mail) --------------------------------


async def _freigabe_mail_senden(db: AsyncSession, person: Person, token: PersonFreigabeToken) -> None:
    basis = await _basis_url(db)
    if not basis:
        return
    nachricht = (
        f"Die Person {person.name} möchte sich am Gerätehaus anmelden, hat aber "
        "keine E-Mail-Adresse hinterlegt und kann daher keinen PIN selbst setzen.\n\n"
        "Bitte gib die Person frei (E-Mail hinterlegen und optional direkt den PIN "
        "setzen) oder lehne die Anfrage ab."
    )
    aktionen = [
        {"label": "Freigeben", "url": f"{basis}/person-freigabe/{token.token}?entscheidung=freigeben", "farbe": "#2e7d32"},
        {"label": "Ablehnen", "url": f"{basis}/person-freigabe/{token.token}?entscheidung=ablehnen", "farbe": "#c62828"},
    ]
    await EmailNotifier().aktions_mail_versenden(
        db, f"PIN-Freigabe für {person.name}", nachricht, aktionen
    )


async def freigabe_anfordern(db: AsyncSession, person_id: int) -> PersonFreigabeToken:
    token = PersonFreigabeToken(
        person_id=person_id,
        token=secrets.token_urlsafe(24),
        erstellt_am=_jetzt(),
        ablauf_am=_jetzt() + timedelta(days=GUELTIGKEIT_TAGE),
        status="offen",
    )
    db.add(token)
    await db.commit()
    await db.refresh(token)
    return token


async def get_freigabe_token(db: AsyncSession, token: str) -> PersonFreigabeToken | None:
    result = await db.execute(select(PersonFreigabeToken).where(PersonFreigabeToken.token == token))
    return result.scalar_one_or_none()


def freigabe_token_offen(token: PersonFreigabeToken) -> bool:
    return token.status == "offen" and _als_utc(token.ablauf_am) > _jetzt()


async def freigabe_einloesen(
    db: AsyncSession, token: PersonFreigabeToken, email: str, pin: str | None
) -> Person:
    """Moderator hinterlegt eine E-Mail (Pflicht) und optional direkt den PIN.
    Ist kein PIN gesetzt, wird der Person anschließend der Self-Service-Link
    geschickt."""
    person = await stammdaten_service.get_person(db, token.person_id)
    if person is None:
        raise ValueError("Person nicht gefunden.")
    person.email = email.strip()
    if pin:
        await stammdaten_service.person_pin_setzen(db, person, pin)
    token.status = "freigegeben"
    await db.commit()
    if not pin:
        await self_service_mail_senden(db, person)
    return person


async def freigabe_ablehnen(db: AsyncSession, token: PersonFreigabeToken) -> None:
    token.status = "abgelehnt"
    await db.commit()


# --- Einstiegspunkt vom Kiosk ("PIN anfordern") -----------------------------


async def erinnerungen_versenden(db: AsyncSession) -> int:
    """Periodisch (Scheduler): schickt Personen ohne gesetzten PIN, aber mit
    E-Mail, alle `pin_erinnerung_intervall_tage` Tage den Self-Service-Link.
    Nur relevant, wenn das Barcode-Modul AUS ist. Gibt die Anzahl versendeter
    Mails zurück."""
    from app.services import feature_modul_service

    if await feature_modul_service.ist_aktiv(db, "barcode"):
        return 0
    intervall = int(await config_service.get(db, "pin_erinnerung_intervall_tage", 7))
    grenze = _jetzt() - timedelta(days=intervall)
    result = await db.execute(
        select(Person).where(
            Person.pin_gesetzt.is_(False),
            Person.email.is_not(None),
        )
    )
    versendet = 0
    for person in result.scalars().all():
        if person.pin_erinnerung_am is not None and _als_utc(person.pin_erinnerung_am) > grenze:
            continue
        if await self_service_mail_senden(db, person):
            person.pin_erinnerung_am = _jetzt()
            versendet += 1
    if versendet:
        await db.commit()
    return versendet


async def pin_anfordern(db: AsyncSession, person: Person) -> str:
    """Löst je nach Datenlage den passenden Weg aus. Gibt einen Statuscode für
    das Frontend zurück: "mail" (Self-Service verschickt) oder "freigabe"
    (Moderator-Freigabe angestoßen)."""
    if person.email:
        await self_service_mail_senden(db, person)
        return "mail"
    token = await freigabe_anfordern(db, person.id)
    await _freigabe_mail_senden(db, person, token)
    return "freigabe"
