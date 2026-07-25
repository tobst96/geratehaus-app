"""Passwort-Self-Service für Mitglieder: „Passwort setzen"-Link per E-Mail.

Analog zu `pin_service`, aber für das persönliche **Passwort** (Mitglieder-/App-
Login) statt den Kiosk-PIN. Eine Person mit hinterlegter E-Mail bekommt einen
einmaligen, ablaufenden Link, über den sie ihr Passwort ohne Login setzt.
"""

import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.person import Person
from app.models.pin_token import PasswortSetzenToken
from app.services import gruppenfuehrer_service, stammdaten_service
from app.services.config_service import config_service
from app.services.notifier.email import EmailNotifier

GUELTIGKEIT_TAGE = 14


def _jetzt() -> datetime:
    return datetime.now(timezone.utc)


def _als_utc(wert: datetime) -> datetime:
    return wert if wert.tzinfo else wert.replace(tzinfo=timezone.utc)


async def _basis_url(db: AsyncSession) -> str:
    return str(await config_service.get(db, "oeffentliche_basis_url", "")).rstrip("/")


async def token_erstellen(db: AsyncSession, person_id: int) -> PasswortSetzenToken:
    token = PasswortSetzenToken(
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


async def get_token(db: AsyncSession, token: str) -> PasswortSetzenToken | None:
    result = await db.execute(select(PasswortSetzenToken).where(PasswortSetzenToken.token == token))
    return result.scalar_one_or_none()


def token_gueltig(token: PasswortSetzenToken) -> bool:
    return not token.eingeloest and _als_utc(token.ablauf_am) > _jetzt()


async def setz_mail_senden(db: AsyncSession, person: Person) -> bool:
    """Legt einen Token an und schickt der Person den Passwort-Setz-Link.
    Voraussetzung: Person hat eine E-Mail und die Basis-URL ist konfiguriert."""
    if not person.email:
        return False
    basis = await _basis_url(db)
    if not basis:
        return False
    token = await token_erstellen(db, person.id)
    link = f"{basis}/passwort-setzen/{token.token}"
    nachricht = (
        f"Hallo {person.name},\n\n"
        "für die Anmeldung an der Gerätehaus.app auf deinem Handy legst du hier dein "
        "persönliches Passwort fest:\n\n"
        f"{link}\n\n"
        f"Der Link ist {GUELTIGKEIT_TAGE} Tage gültig. Wenn du das nicht angefordert "
        "hast, kannst du diese E-Mail ignorieren."
    )
    await EmailNotifier().send_an(db, person.email, "Passwort für Gerätehaus.app setzen", nachricht)
    return True


async def setzen_per_token(db: AsyncSession, token: PasswortSetzenToken, passwort: str) -> Person:
    person = await stammdaten_service.get_person(db, token.person_id)
    if person is None:
        raise ValueError("Person nicht gefunden.")
    # Passwort setzen (committet) und einen evtl. bestehenden Lockout aufheben.
    await gruppenfuehrer_service.person_passwort_setzen(db, person, passwort)
    person.login_fehlversuche = 0
    person.login_gesperrt_bis = None
    token.eingeloest = True
    await db.commit()
    return person


async def anfordern_per_name(db: AsyncSession, name: str) -> str:
    """Sucht die Person per Name und schickt – falls möglich – den Set-Link.
    Rückgabe: "mail" (versendet), "keine_email" (Person ohne E-Mail) oder
    "unbekannt" (kein Treffer). Der Aufrufer antwortet bewusst immer gleich
    (kein Enumeration-Leak)."""
    person = (
        await db.execute(select(Person).where(Person.name == name.strip()))
    ).scalar_one_or_none()
    if person is None:
        return "unbekannt"
    if not person.email:
        return "keine_email"
    versendet = await setz_mail_senden(db, person)
    return "mail" if versendet else "keine_email"
