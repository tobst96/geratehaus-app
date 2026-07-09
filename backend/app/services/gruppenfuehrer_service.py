"""Login + Verwaltung des erhöhten Zugangs (Person = Konto).

Eine „elevated" Person (`gruppenfuehrer_rolle` gesetzt: admin/gruppenfuehrer) meldet sich
am Gruppenführerbereich mit Name + Passwort (+2FA) an; ihr PIN bleibt für Kiosk/Mitglied.
Die Verwaltung (elevieren/de-elevieren/Passwort) läuft über Personal.
"""

from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_secret, verify_secret
from app.models.person import Person
from app.services.config_service import config_service


class GruppenfuehrerGesperrtError(Exception):
    """Der Passwort-Login ist wegen zu vieler Fehlversuche temporär gesperrt."""

    def __init__(self, verbleibend_sekunden: int) -> None:
        super().__init__("Login vorübergehend gesperrt.")
        self.verbleibend_sekunden = verbleibend_sekunden


def _als_utc(dt: datetime) -> datetime:
    return dt if dt.tzinfo is not None else dt.replace(tzinfo=timezone.utc)


async def login_pruefen(db: AsyncSession, name: str, passwort: str) -> Person | None:
    """Prüft die Anmeldedaten einer **Person** am Gruppenführerbereich (Name + Passwort)
    mit Brute-Force-Schutz. Login gelingt nur, wenn die Person ein Passwort gesetzt
    hat; die Elevated-Prüfung (`gruppenfuehrer_rolle`) macht das Gate in deps.

    - Person existiert nicht / hat kein Passwort → None (401, ohne Enumeration/Sperre).
    - Gesperrt (`login_gesperrt_bis` in der Zukunft) → `GruppenfuehrerGesperrtError`.
    - Passwort korrekt → Zähler/Sperre zurücksetzen, Person zurückgeben.
    - Passwort falsch → Fehlversuchszähler erhöhen; ab `gruppenfuehrer_login_max_fehlversuche`
      wird der Zugang für `gruppenfuehrer_login_sperre_minuten` gesperrt → None.
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
        raise GruppenfuehrerGesperrtError(int((gesperrt_bis - jetzt).total_seconds()) + 1)
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

    max_fehlversuche = int(await config_service.get(db, "gruppenfuehrer_login_max_fehlversuche", 5))
    sperre_minuten = int(await config_service.get(db, "gruppenfuehrer_login_sperre_minuten", 15))
    person.login_fehlversuche = (person.login_fehlversuche or 0) + 1
    if max_fehlversuche > 0 and person.login_fehlversuche >= max_fehlversuche:
        person.login_gesperrt_bis = jetzt + timedelta(minutes=sperre_minuten)
        person.login_fehlversuche = 0
    await db.commit()
    return None


def _email_normalisieren(email: str | None) -> str | None:
    """Leeren/whitespace-String als „keine E-Mail" (NULL) behandeln."""
    if email is None:
        return None
    wert = email.strip()
    return wert or None


async def admin_benachrichtigungs_empfaenger(db: AsyncSession) -> list[str]:
    """E-Mail-Empfänger für Admin-/Betriebs-Benachrichtigungen: **elevated Personen**
    (Admin/Gruppenführer) mit aktiviertem Opt-in **plus** die bestehende globale Liste
    `notifier_email_recipients` (non-breaking – bestehende Empfänger behalten).
    Case-insensitiv dedupliziert, Reihenfolge stabil (Personen zuerst)."""
    result = await db.execute(
        select(Person.email).where(
            Person.gruppenfuehrer_rolle.is_not(None),
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


# --- Erhöhte Rechte verwalten (elevieren / de-elevieren / Passwort) ---


async def elevated_liste(db: AsyncSession) -> list[Person]:
    """Alle Personen mit erhöhtem Zugang (Admin/Gruppenführer)."""
    result = await db.execute(
        select(Person).where(Person.gruppenfuehrer_rolle.is_not(None)).order_by(Person.name)
    )
    return list(result.scalars().all())


async def anzahl_admins(db: AsyncSession) -> int:
    return (
        await db.execute(
            select(func.count()).select_from(Person).where(Person.gruppenfuehrer_rolle == "admin")
        )
    ).scalar_one()


async def person_elevieren(
    db: AsyncSession, person: Person, rolle: str, passwort: str | None = None
) -> Person:
    """Setzt/ändert die erhöhte Rolle (`admin`/`gruppenfuehrer`) einer Person und
    optional das Passwort. Hat die Person noch kein Passwort, MUSS eins mitgegeben
    werden (sonst kann sie sich nicht anmelden – Prüfung im Router)."""
    person.gruppenfuehrer_rolle = rolle
    if passwort:
        person.passwort_hash = hash_secret(passwort)
    await db.commit()
    await db.refresh(person)
    return person


async def person_passwort_setzen(db: AsyncSession, person: Person, passwort: str) -> Person:
    person.passwort_hash = hash_secret(passwort)
    await db.commit()
    await db.refresh(person)
    return person


async def person_de_elevieren(db: AsyncSession, person: Person) -> Person:
    """Entzieht den erhöhten Zugang: Rolle + Passwort weg und 2FA/Recovery/Trusted-
    Devices abräumen. Die Person bleibt als normales Mitglied bestehen (PIN/Barcode)."""
    person.gruppenfuehrer_rolle = None
    person.passwort_hash = None
    person.login_fehlversuche = 0
    person.login_gesperrt_bis = None
    from app.services import zwei_faktor_service

    await zwei_faktor_service.deaktivieren(db, person)  # committet inkl. der Felder oben
    await db.refresh(person)
    return person
