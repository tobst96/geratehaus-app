from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_secret, verify_secret
from app.models.moderator import Moderator
from app.models.person import Person
from app.services.config_service import config_service


class ModeratorGesperrtError(Exception):
    """Der Moderator-Login ist wegen zu vieler Fehlversuche temporär gesperrt."""

    def __init__(self, verbleibend_sekunden: int) -> None:
        super().__init__("Moderator-Login vorübergehend gesperrt.")
        self.verbleibend_sekunden = verbleibend_sekunden


def _als_utc(dt: datetime) -> datetime:
    return dt if dt.tzinfo is not None else dt.replace(tzinfo=timezone.utc)


async def login_pruefen(db: AsyncSession, name: str, passwort: str) -> Person | None:
    """Prüft die Anmeldedaten einer **Person** am Moderatorbereich (Name + Passwort)
    mit Brute-Force-Schutz. Login gelingt nur, wenn die Person ein Passwort gesetzt
    hat (elevated); die Elevated-Prüfung (`moderator_rolle`) macht das Gate in deps.

    - Person existiert nicht / hat kein Passwort → None (401, ohne Enumeration/Sperre).
    - Gesperrt (`login_gesperrt_bis` in der Zukunft) → `ModeratorGesperrtError`.
    - Passwort korrekt → Zähler/Sperre zurücksetzen, Person zurückgeben.
    - Passwort falsch → Fehlversuchszähler erhöhen; ab `moderator_login_max_fehlversuche`
      wird der Zugang für `moderator_login_sperre_minuten` gesperrt → None.
    """
    person = (
        await db.execute(select(Person).where(Person.name == name))
    ).scalar_one_or_none()
    if person is None or not person.passwort_hash:
        return None

    jetzt = datetime.now(timezone.utc)
    veraendert = False
    gesperrt_bis = _als_utc(person.login_gesperrt_bis) if person.login_gesperrt_bis else None
    if gesperrt_bis is not None and gesperrt_bis > jetzt:
        raise ModeratorGesperrtError(int((gesperrt_bis - jetzt).total_seconds()) + 1)
    if gesperrt_bis is not None:  # Sperre abgelaufen
        person.login_gesperrt_bis = None
        person.login_fehlversuche = 0
        veraendert = True

    if verify_secret(passwort, person.passwort_hash):
        if person.login_fehlversuche or person.login_gesperrt_bis is not None:
            person.login_fehlversuche = 0
            person.login_gesperrt_bis = None
            veraendert = True
        if veraendert:
            await db.commit()
        return person

    max_fehlversuche = int(await config_service.get(db, "moderator_login_max_fehlversuche", 5))
    sperre_minuten = int(await config_service.get(db, "moderator_login_sperre_minuten", 15))
    person.login_fehlversuche = (person.login_fehlversuche or 0) + 1
    if max_fehlversuche > 0 and person.login_fehlversuche >= max_fehlversuche:
        person.login_gesperrt_bis = jetzt + timedelta(minutes=sperre_minuten)
        person.login_fehlversuche = 0
    await db.commit()
    return None


async def liste_moderatoren(db: AsyncSession) -> list[Moderator]:
    result = await db.execute(select(Moderator).order_by(Moderator.username))
    return list(result.scalars().all())


async def get_moderator(db: AsyncSession, moderator_id: int) -> Moderator | None:
    result = await db.execute(select(Moderator).where(Moderator.id == moderator_id))
    return result.scalar_one_or_none()


async def get_moderator_by_username(db: AsyncSession, username: str) -> Moderator | None:
    result = await db.execute(select(Moderator).where(Moderator.username == username))
    return result.scalar_one_or_none()


def _email_normalisieren(email: str | None) -> str | None:
    """Leeren/whitespace-String als „keine E-Mail" (NULL) behandeln."""
    if email is None:
        return None
    wert = email.strip()
    return wert or None


async def moderator_anlegen(
    db: AsyncSession,
    username: str,
    passwort: str,
    rolle: str = "admin",
    email: str | None = None,
    benachrichtigungen_aktiv: bool = False,
) -> Moderator:
    moderator = Moderator(
        username=username,
        passwort_hash=hash_secret(passwort),
        rolle=rolle,
        email=_email_normalisieren(email),
        benachrichtigungen_aktiv=benachrichtigungen_aktiv,
    )
    db.add(moderator)
    await db.commit()
    await db.refresh(moderator)
    return moderator


async def moderator_aktualisieren(
    db: AsyncSession,
    moderator: Moderator,
    email: str | None = None,
    email_gesetzt: bool = False,
    benachrichtigungen_aktiv: bool | None = None,
) -> Moderator:
    """Aktualisiert E-Mail und/oder das Benachrichtigungs-Opt-in. `email_gesetzt`
    unterscheidet „E-Mail nicht mitgesendet" von „E-Mail auf leer/NULL gesetzt"."""
    if email_gesetzt:
        moderator.email = _email_normalisieren(email)
    if benachrichtigungen_aktiv is not None:
        moderator.benachrichtigungen_aktiv = benachrichtigungen_aktiv
    await db.commit()
    await db.refresh(moderator)
    return moderator


async def moderator_email_setzen(db: AsyncSession, moderator: Moderator, email: str | None) -> Moderator:
    moderator.email = _email_normalisieren(email)
    await db.commit()
    await db.refresh(moderator)
    return moderator


async def admin_benachrichtigungs_empfaenger(db: AsyncSession) -> list[str]:
    """E-Mail-Empfänger für Admin-/Betriebs-Benachrichtigungen: **elevated Personen**
    (Admin/Gruppenführer) mit aktiviertem Opt-in **plus** die bestehende globale Liste
    `notifier_email_recipients` (non-breaking – bestehende Empfänger behalten).
    Case-insensitiv dedupliziert, Reihenfolge stabil (Personen zuerst)."""
    result = await db.execute(
        select(Person.email).where(
            Person.moderator_rolle.is_not(None),
            Person.benachrichtigungen_aktiv.is_(True),
            Person.email.is_not(None),
        )
    )
    elevated = [e for e in result.scalars().all() if e]
    roh = str(await config_service.get(db, "notifier_email_recipients", "") or "")
    legacy = [e.strip() for e in roh.split(",") if e.strip()]
    gesehen: set[str] = set()
    ergebnis: list[str] = []
    for adresse in [*elevated, *legacy]:
        schluessel = adresse.lower()
        if schluessel not in gesehen:
            gesehen.add(schluessel)
            ergebnis.append(adresse)
    return ergebnis


async def moderator_passwort_aendern(db: AsyncSession, moderator: Moderator, passwort: str) -> Moderator:
    moderator.passwort_hash = hash_secret(passwort)
    await db.commit()
    await db.refresh(moderator)
    return moderator


async def anzahl_moderatoren(db: AsyncSession) -> int:
    result = await db.execute(select(func.count()).select_from(Moderator))
    return result.scalar_one()


async def moderator_loeschen(db: AsyncSession, moderator: Moderator) -> None:
    await db.delete(moderator)
    await db.commit()
