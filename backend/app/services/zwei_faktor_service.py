"""Zwei-Faktor-Authentisierung (E-Mail-OTP) für Gruppenführer-/Admin-Logins.

Opt-in pro Zugang. Nach korrektem Passwort wird – sofern das Gerät nicht als
vertrauenswürdig bekannt ist – ein 6-stelliger Code an die hinterlegte E-Mail
geschickt und im zweiten Schritt geprüft. Recovery-Codes und ein Admin-Reset
sichern gegen Aussperren ab.

Hash-Strategie:
- OTP + Recovery-Codes: bcrypt (`hash_secret`/`verify_secret`) – niedrige Entropie,
  daher langsamer Hash + Rate-Limit/Versuchszähler.
- Trusted-Device-Token: hoch-entropes Zufallstoken → deterministischer SHA-256
  für indizierten Lookup (kein Salt nötig, da nicht ratbar).
"""

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

import structlog
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_secret, verify_secret
from app.models.gruppenfuehrer import GruppenfuehrerRecoveryCode, GruppenfuehrerTrustedDevice
from app.models.person import Person

logger = structlog.get_logger(__name__)

OTP_GUELTIGKEIT_MINUTEN = 10
OTP_MAX_VERSUCHE = 5
RECOVERY_CODE_ANZAHL = 10
TRUSTED_DEVICE_TAGE = 30


def _jetzt() -> datetime:
    return datetime.now(timezone.utc)


def _als_utc(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    return dt if dt.tzinfo is not None else dt.replace(tzinfo=timezone.utc)


def _sha256(wert: str) -> str:
    return hashlib.sha256(wert.encode()).hexdigest()


# --- OTP -------------------------------------------------------------------

async def otp_erzeugen_und_senden(db: AsyncSession, person: Person) -> str:
    """Erzeugt einen neuen 6-stelligen OTP, speichert ihn (gehasht) und versucht
    ihn zuzustellen – zuerst per E-Mail, bei Mailfehler (SMTP nicht erreichbar/
    falsch konfiguriert oder gar nicht konfiguriert) über den Netzwerkdrucker-
    Fallback (IPP, sofern `drucker_aktiv`), sonst gar nicht. Wirft ValueError,
    wenn keine E-Mail gesetzt ist (Voraussetzung für aktives 2FA, siehe
    `aktivieren()` – in der Praxis also nur ein Invarianten-Schutz).

    Gibt den tatsächlichen Versandweg zurück: ``"email"``, ``"druck"`` oder
    ``"keiner"``. Im letzten Fall bleiben die bei der 2FA-Einrichtung
    ausgegebenen Recovery-Codes der einzige Weg, den zweiten Login-Schritt
    abzuschließen – das ist bewusst kein Fehlerfall dieser Funktion (kein
    Login-Ausschluss, siehe Etappe AA), sondern wird nur protokolliert."""
    if not person.email:
        raise ValueError("Für diesen Zugang ist keine E-Mail hinterlegt.")
    code = f"{secrets.randbelow(1_000_000):06d}"
    person.otp_code_hash = hash_secret(code)
    person.otp_ablauf_am = _jetzt() + timedelta(minutes=OTP_GUELTIGKEIT_MINUTEN)
    person.otp_versuche = 0
    await db.commit()

    from app.services import druck_service, pdf_service
    from app.services.notifier.email import EmailNotifier

    try:
        await EmailNotifier().otp_versenden(
            db,
            person.email,
            "Dein Login-Code für Gerätehaus.app",
            f"Dein Anmelde-Code ist {OTP_GUELTIGKEIT_MINUTEN} Minuten gültig. Wenn du dich "
            f"nicht anmelden wolltest, ignoriere diese E-Mail.",
            code,
        )
        return "email"
    except Exception:
        logger.warning("2fa_otp_mail_fehlgeschlagen", person_id=person.id, exc_info=True)

    try:
        pdf_inhalt = await pdf_service.otp_pdf(db, person.name, code, OTP_GUELTIGKEIT_MINUTEN)
        if await druck_service.drucke_pdf_falls_konfiguriert(db, pdf_inhalt):
            return "druck"
    except Exception:
        logger.warning("2fa_otp_druck_fehlgeschlagen", person_id=person.id, exc_info=True)

    logger.warning("2fa_otp_kein_versandweg", person_id=person.id)
    return "keiner"


async def otp_pruefen(db: AsyncSession, person: Person, code: str) -> bool:
    if not person.otp_code_hash or person.otp_ablauf_am is None:
        return False
    if _als_utc(person.otp_ablauf_am) < _jetzt():
        await _otp_loeschen(db, person)
        return False
    if person.otp_versuche >= OTP_MAX_VERSUCHE:
        return False
    if verify_secret(code.strip(), person.otp_code_hash):
        await _otp_loeschen(db, person)
        return True
    person.otp_versuche += 1
    await db.commit()
    return False


async def _otp_loeschen(db: AsyncSession, person: Person) -> None:
    person.otp_code_hash = None
    person.otp_ablauf_am = None
    person.otp_versuche = 0
    await db.commit()


# --- Recovery-Codes --------------------------------------------------------

def _recovery_code_erzeugen() -> str:
    # Gut lesbar/abtippbar: 2 Blöcke à 4 Zeichen (Base32-ähnlich, ohne 0/O/1/I).
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    teile = ["".join(secrets.choice(alphabet) for _ in range(4)) for _ in range(2)]
    return "-".join(teile)


async def recovery_codes_erzeugen(db: AsyncSession, person: Person) -> list[str]:
    """Erzeugt einen frischen Satz Recovery-Codes (ersetzt vorhandene) und gibt
    sie **einmalig im Klartext** zurück (danach nur noch als Hash gespeichert)."""
    await db.execute(
        delete(GruppenfuehrerRecoveryCode).where(GruppenfuehrerRecoveryCode.person_id == person.id)
    )
    codes = [_recovery_code_erzeugen() for _ in range(RECOVERY_CODE_ANZAHL)]
    for code in codes:
        db.add(GruppenfuehrerRecoveryCode(person_id=person.id, code_hash=hash_secret(code)))
    await db.commit()
    return codes


async def recovery_code_pruefen(db: AsyncSession, person: Person, code: str) -> bool:
    eingabe = code.strip().upper()
    offene = (
        await db.execute(
            select(GruppenfuehrerRecoveryCode).where(
                GruppenfuehrerRecoveryCode.person_id == person.id,
                GruppenfuehrerRecoveryCode.benutzt.is_(False),
            )
        )
    ).scalars().all()
    for eintrag in offene:
        if verify_secret(eingabe, eintrag.code_hash):
            eintrag.benutzt = True
            await db.commit()
            return True
    return False


# --- Trusted Devices -------------------------------------------------------

async def trusted_device_ausstellen(db: AsyncSession, person: Person) -> str:
    """Legt ein vertrauenswürdiges Gerät an (30 Tage) und gibt das Roh-Token
    zurück (kommt als httponly-Cookie zum Client, DB speichert nur den Hash)."""
    roh = secrets.token_urlsafe(32)
    db.add(
        GruppenfuehrerTrustedDevice(
            person_id=person.id,
            token_hash=_sha256(roh),
            ablauf_am=_jetzt() + timedelta(days=TRUSTED_DEVICE_TAGE),
            erstellt_am=_jetzt(),
        )
    )
    await db.commit()
    return roh


async def trusted_device_gueltig(db: AsyncSession, person: Person, roh_token: str | None) -> bool:
    if not roh_token:
        return False
    eintrag = (
        await db.execute(
            select(GruppenfuehrerTrustedDevice).where(
                GruppenfuehrerTrustedDevice.person_id == person.id,
                GruppenfuehrerTrustedDevice.token_hash == _sha256(roh_token),
            )
        )
    ).scalar_one_or_none()
    if eintrag is None:
        return False
    return _als_utc(eintrag.ablauf_am) >= _jetzt()


# --- Aktivierung / Reset ---------------------------------------------------

async def aktivieren(db: AsyncSession, person: Person) -> list[str]:
    """Schaltet 2FA für den Zugang ein und gibt frische Recovery-Codes zurück.
    Voraussetzung: hinterlegte E-Mail."""
    if not person.email:
        raise ValueError("Für 2FA muss zuerst eine E-Mail hinterlegt werden.")
    person.zwei_faktor_aktiv = True
    await db.commit()
    return await recovery_codes_erzeugen(db, person)


async def deaktivieren(db: AsyncSession, person: Person) -> None:
    """Schaltet 2FA aus und räumt OTP, Recovery-Codes und Trusted-Devices ab.
    Dient auch als Admin-Reset (Aussperren aufheben) - deshalb wird auch
    `sicherheit_geaendert_am` aktualisiert: ein 2FA-Reset ist eine sicherheitsrelevante
    Änderung und muss laufende Gruppenführer-Tokens entwerten (siehe JWT-Claim
    `sicherheit_stand` in `gruppenfuehrer_service.gruppenfuehrer_token`)."""
    person.zwei_faktor_aktiv = False
    person.otp_code_hash = None
    person.otp_ablauf_am = None
    person.otp_versuche = 0
    person.sicherheit_geaendert_am = _jetzt()
    await db.execute(
        delete(GruppenfuehrerRecoveryCode).where(GruppenfuehrerRecoveryCode.person_id == person.id)
    )
    await db.execute(
        delete(GruppenfuehrerTrustedDevice).where(GruppenfuehrerTrustedDevice.person_id == person.id)
    )
    await db.commit()
