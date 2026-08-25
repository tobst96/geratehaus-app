"""Login + Verwaltung des erhöhten Zugangs (Person = Konto).

Eine „elevated" Person (`gruppenfuehrer_rolle` gesetzt: admin/gruppenfuehrer) meldet sich
am Gruppenführerbereich mit E-Mail + Passwort (+2FA) an; ihr PIN bleibt für Kiosk/Mitglied.
Der Mitglieder-Passwort-Login (`/auth/mitglied-login`) nutzt denselben Mechanismus. Die
Verwaltung (elevieren/de-elevieren/Passwort) läuft über Personal.

Login läuft bewusst über E-Mail statt Name: der `name` bleibt intern der stabile
Identifikator (JWT-`sub`, Kiosk/PIN-Anzeige), aber für den Login ist eine
E-Mail-Adresse der natürlichere, eindeutigere Login-Name. E-Mail ist daher unter den
Personen mit gesetztem Passwort eindeutig (siehe Migration 0070 – partieller
Unique-Index nur für passwort_hash IS NOT NULL, damit reine Mitglieder ohne Login
weiterhin dieselbe Benachrichtigungs-E-Mail teilen dürfen, z. B. ein Familien-Postfach).
"""

from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import gruppenfuehrer_2fa_session
from app.core.security import create_access_token, hash_secret, sicherheit_stand_claim, verify_secret
from app.models.person import Person
from app.schemas.auth import GruppenfuehrerLoginErgebnis
from app.services import zwei_faktor_service
from app.services.config_service import config_service


class GruppenfuehrerGesperrtError(Exception):
    """Der Passwort-Login ist wegen zu vieler Fehlversuche temporär gesperrt."""

    def __init__(self, verbleibend_sekunden: int) -> None:
        super().__init__("Login vorübergehend gesperrt.")
        self.verbleibend_sekunden = verbleibend_sekunden


def _als_utc(dt: datetime) -> datetime:
    return dt if dt.tzinfo is not None else dt.replace(tzinfo=timezone.utc)


async def login_pruefen(db: AsyncSession, email: str, passwort: str) -> Person | None:
    """Prüft die Anmeldedaten einer **Person** am Gruppenführerbereich/Mitglied-Login
    (E-Mail + Passwort) mit Brute-Force-Schutz. Login gelingt nur, wenn die Person ein
    Passwort gesetzt hat; die Elevated-Prüfung (`gruppenfuehrer_rolle`) macht das Gate
    für den Gruppenführerbereich in deps.

    - Keine/leere E-Mail, kein Treffer oder kein gesetztes Passwort → None (401, ohne
      Enumeration/Sperre).
    - Gesperrt (`login_gesperrt_bis` in der Zukunft) → `GruppenfuehrerGesperrtError`.
    - Passwort korrekt → Zähler/Sperre zurücksetzen, Person zurückgeben.
    - Passwort falsch → Fehlversuchszähler erhöhen; ab `gruppenfuehrer_login_max_fehlversuche`
      wird der Zugang für `gruppenfuehrer_login_sperre_minuten` gesperrt → None.
    """
    email_normalisiert = _email_normalisieren(email)
    if email_normalisiert is None:
        return None
    person = (
        await db.execute(
            select(Person).where(func.lower(Person.email) == email_normalisiert.lower())
        )
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


async def email_bereits_fuer_login_vergeben(
    db: AsyncSession, email: str, ausser_person_id: int | None = None
) -> bool:
    """True, wenn eine ANDERE Person mit gesetztem Passwort bereits dieselbe
    E-Mail (case-insensitiv) trägt – Login läuft über E-Mail, die muss also
    unter Login-fähigen Personen eindeutig sein (siehe Migration 0070, die
    das zusätzlich als partiellen DB-Unique-Index absichert)."""
    stmt = select(func.count()).select_from(Person).where(
        func.lower(Person.email) == email.strip().lower(),
        Person.passwort_hash.is_not(None),
    )
    if ausser_person_id is not None:
        stmt = stmt.where(Person.id != ausser_person_id)
    anzahl = (await db.execute(stmt)).scalar_one()
    return anzahl > 0


async def person_elevieren(
    db: AsyncSession, person: Person, rolle: str, passwort: str | None = None
) -> Person:
    """Setzt/ändert die erhöhte Rolle (`admin`/`gruppenfuehrer`) einer Person und
    optional das Passwort. Hat die Person noch kein Passwort, MUSS eins mitgegeben
    werden (sonst kann sie sich nicht anmelden – Prüfung im Router)."""
    person.gruppenfuehrer_rolle = rolle
    if passwort:
        person.passwort_hash = hash_secret(passwort)
        person.sicherheit_geaendert_am = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(person)
    return person


async def person_passwort_setzen(db: AsyncSession, person: Person, passwort: str) -> Person:
    """Setzt/ändert das Passwort einer Person – egal ob durch die Person selbst
    (`/auth/mein-passwort`, Self-Service-Link) oder durch einen Admin (Personal).
    Aktualisiert bewusst `sicherheit_geaendert_am` (nicht `updated_at`, das läuft bei
    JEDER Personen-Änderung mit) - dieser Zeitpunkt entwertet über den JWT-Claim
    (siehe `gruppenfuehrer_token`) alle zuvor ausgestellten Gruppenführer-Tokens."""
    person.passwort_hash = hash_secret(passwort)
    person.sicherheit_geaendert_am = datetime.now(timezone.utc)
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

    await zwei_faktor_service.deaktivieren(db, person)  # committet inkl. der Felder oben
    await db.refresh(person)
    return person


def gruppenfuehrer_token(person: Person) -> str:
    """`sub` ist die stabile `Person.id`, nicht der Name - der Name kann sich jederzeit
    ändern (Stammdaten-Bearbeitung setzt ihn aus Vorname/Zwischenname/Nachname neu
    zusammen), was ein bereits ausgestelltes Token sonst sofort ungültig machen würde
    (Admin bearbeitet den eigenen Namen -> wird ausgeloggt).

    Zusätzlich trägt das Token den `sicherheit_stand`-Claim (Snapshot von
    `Person.sicherheit_geaendert_am` im Ausstellungszeitpunkt). `get_current_gruppenfuehrer`
    vergleicht ihn bei jedem Request gegen den aktuellen DB-Wert - ändert sich der
    (Passwort/2FA-Reset), wird dieses Token beim nächsten Request abgelehnt."""
    return create_access_token(
        subject=str(person.id),
        extra_claims={
            "rolle": person.gruppenfuehrer_rolle,
            "sicherheit_stand": sicherheit_stand_claim(person.sicherheit_geaendert_am),
        },
    )


async def zugang_entscheiden(
    db: AsyncSession, person: Person, trusted_device_roh: str | None
) -> GruppenfuehrerLoginErgebnis:
    """Entscheidet, wie eine bereits als Passwort- ODER Cookie-authentifizierte
    Person Zugang zum Gruppenführerbereich erhält: direktes Token, Pflicht-
    2FA-Einrichtung oder OTP-Challenge. Wiederverwendet von `/gruppenfuehrer/login`
    (Passwort) und `/gruppenfuehrer/step-up` (bereits per Namens-Cookie
    identifizierte Person, kein erneutes Passwort nötig)."""
    # Zugang ohne aktives 2FA: Pflicht-Einrichtung nur erzwingen, wenn auch SMTP
    # konfiguriert ist – sonst käme der Anmelde-Code nie an und niemand könnte
    # (z. B. auf einer frisch eingerichteten Instanz) je in den Gruppenführer-/
    # Admin-Bereich, um SMTP überhaupt erst einzurichten.
    if not person.zwei_faktor_aktiv:
        pflicht = bool(await config_service.get(db, "zwei_faktor_pflicht", False))
        mail_konfiguriert = bool(await config_service.get(db, "notifier_email_smtp_host", ""))
        if pflicht and mail_konfiguriert:
            return GruppenfuehrerLoginErgebnis(
                einrichtung_erforderlich=True,
                email_gesetzt=bool(person.email),
                challenge=gruppenfuehrer_2fa_session.signiere_challenge(person.id),
            )
        return GruppenfuehrerLoginErgebnis(access_token=gruppenfuehrer_token(person))

    # 2FA aktiv, aber bereits vertrauenswürdiges Gerät → direkt Token ausstellen.
    if await zwei_faktor_service.trusted_device_gueltig(db, person, trusted_device_roh):
        return GruppenfuehrerLoginErgebnis(access_token=gruppenfuehrer_token(person))

    # 2FA: OTP per E-Mail senden (Best-Effort – ohne E-Mail bleibt der
    # Recovery-Code-Weg) und Challenge für den zweiten Schritt zurückgeben.
    try:
        await zwei_faktor_service.otp_erzeugen_und_senden(db, person)
    except ValueError:
        pass
    return GruppenfuehrerLoginErgebnis(
        zwei_faktor_erforderlich=True,
        challenge=gruppenfuehrer_2fa_session.signiere_challenge(person.id),
    )
