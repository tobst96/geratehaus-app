"""Zwei-Faktor-Authentisierung (E-Mail-OTP) für Moderator-/Admin-Logins.

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

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_secret, verify_secret
from app.models.moderator import Moderator, ModeratorRecoveryCode, ModeratorTrustedDevice

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

async def otp_erzeugen_und_senden(db: AsyncSession, moderator: Moderator) -> None:
    """Erzeugt einen neuen 6-stelligen OTP, speichert ihn (gehasht) und schickt
    ihn an die hinterlegte E-Mail. Wirft ValueError, wenn keine E-Mail gesetzt ist."""
    if not moderator.email:
        raise ValueError("Für diesen Zugang ist keine E-Mail hinterlegt.")
    code = f"{secrets.randbelow(1_000_000):06d}"
    moderator.otp_code_hash = hash_secret(code)
    moderator.otp_ablauf_am = _jetzt() + timedelta(minutes=OTP_GUELTIGKEIT_MINUTEN)
    moderator.otp_versuche = 0
    await db.commit()

    from app.services.notifier.email import EmailNotifier

    await EmailNotifier().send_an(
        db,
        moderator.email,
        "Dein Login-Code für Gerätehaus.app",
        f"Dein Anmelde-Code lautet: {code}\n\n"
        f"Er ist {OTP_GUELTIGKEIT_MINUTEN} Minuten gültig. Wenn du dich nicht anmelden "
        f"wolltest, ignoriere diese E-Mail.",
    )


async def otp_pruefen(db: AsyncSession, moderator: Moderator, code: str) -> bool:
    if not moderator.otp_code_hash or moderator.otp_ablauf_am is None:
        return False
    if _als_utc(moderator.otp_ablauf_am) < _jetzt():
        await _otp_loeschen(db, moderator)
        return False
    if moderator.otp_versuche >= OTP_MAX_VERSUCHE:
        return False
    if verify_secret(code.strip(), moderator.otp_code_hash):
        await _otp_loeschen(db, moderator)
        return True
    moderator.otp_versuche += 1
    await db.commit()
    return False


async def _otp_loeschen(db: AsyncSession, moderator: Moderator) -> None:
    moderator.otp_code_hash = None
    moderator.otp_ablauf_am = None
    moderator.otp_versuche = 0
    await db.commit()


# --- Recovery-Codes --------------------------------------------------------

def _recovery_code_erzeugen() -> str:
    # Gut lesbar/abtippbar: 2 Blöcke à 4 Zeichen (Base32-ähnlich, ohne 0/O/1/I).
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    teile = ["".join(secrets.choice(alphabet) for _ in range(4)) for _ in range(2)]
    return "-".join(teile)


async def recovery_codes_erzeugen(db: AsyncSession, moderator: Moderator) -> list[str]:
    """Erzeugt einen frischen Satz Recovery-Codes (ersetzt vorhandene) und gibt
    sie **einmalig im Klartext** zurück (danach nur noch als Hash gespeichert)."""
    await db.execute(
        delete(ModeratorRecoveryCode).where(ModeratorRecoveryCode.moderator_id == moderator.id)
    )
    codes = [_recovery_code_erzeugen() for _ in range(RECOVERY_CODE_ANZAHL)]
    for code in codes:
        db.add(ModeratorRecoveryCode(moderator_id=moderator.id, code_hash=hash_secret(code)))
    await db.commit()
    return codes


async def recovery_code_pruefen(db: AsyncSession, moderator: Moderator, code: str) -> bool:
    eingabe = code.strip().upper()
    offene = (
        await db.execute(
            select(ModeratorRecoveryCode).where(
                ModeratorRecoveryCode.moderator_id == moderator.id,
                ModeratorRecoveryCode.benutzt.is_(False),
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

async def trusted_device_ausstellen(db: AsyncSession, moderator: Moderator) -> str:
    """Legt ein vertrauenswürdiges Gerät an (30 Tage) und gibt das Roh-Token
    zurück (kommt als httponly-Cookie zum Client, DB speichert nur den Hash)."""
    roh = secrets.token_urlsafe(32)
    db.add(
        ModeratorTrustedDevice(
            moderator_id=moderator.id,
            token_hash=_sha256(roh),
            ablauf_am=_jetzt() + timedelta(days=TRUSTED_DEVICE_TAGE),
            erstellt_am=_jetzt(),
        )
    )
    await db.commit()
    return roh


async def trusted_device_gueltig(db: AsyncSession, moderator: Moderator, roh_token: str | None) -> bool:
    if not roh_token:
        return False
    eintrag = (
        await db.execute(
            select(ModeratorTrustedDevice).where(
                ModeratorTrustedDevice.moderator_id == moderator.id,
                ModeratorTrustedDevice.token_hash == _sha256(roh_token),
            )
        )
    ).scalar_one_or_none()
    if eintrag is None:
        return False
    return _als_utc(eintrag.ablauf_am) >= _jetzt()


# --- Aktivierung / Reset ---------------------------------------------------

async def aktivieren(db: AsyncSession, moderator: Moderator) -> list[str]:
    """Schaltet 2FA für den Zugang ein und gibt frische Recovery-Codes zurück.
    Voraussetzung: hinterlegte E-Mail."""
    if not moderator.email:
        raise ValueError("Für 2FA muss zuerst eine E-Mail hinterlegt werden.")
    moderator.zwei_faktor_aktiv = True
    await db.commit()
    return await recovery_codes_erzeugen(db, moderator)


async def deaktivieren(db: AsyncSession, moderator: Moderator) -> None:
    """Schaltet 2FA aus und räumt OTP, Recovery-Codes und Trusted-Devices ab.
    Dient auch als Admin-Reset (Aussperren aufheben)."""
    moderator.zwei_faktor_aktiv = False
    moderator.otp_code_hash = None
    moderator.otp_ablauf_am = None
    moderator.otp_versuche = 0
    await db.execute(
        delete(ModeratorRecoveryCode).where(ModeratorRecoveryCode.moderator_id == moderator.id)
    )
    await db.execute(
        delete(ModeratorTrustedDevice).where(ModeratorTrustedDevice.moderator_id == moderator.id)
    )
    await db.commit()
