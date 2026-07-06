from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_secret, verify_secret
from app.models.moderator import Moderator
from app.services.config_service import config_service


class ModeratorGesperrtError(Exception):
    """Der Moderator-Login ist wegen zu vieler Fehlversuche temporär gesperrt."""

    def __init__(self, verbleibend_sekunden: int) -> None:
        super().__init__("Moderator-Login vorübergehend gesperrt.")
        self.verbleibend_sekunden = verbleibend_sekunden


def _als_utc(dt: datetime) -> datetime:
    return dt if dt.tzinfo is not None else dt.replace(tzinfo=timezone.utc)


async def login_pruefen(db: AsyncSession, username: str, passwort: str) -> Moderator | None:
    """Prüft die Moderator-Anmeldedaten mit Brute-Force-Schutz.

    - Existiert der Zugang nicht → None (401, ohne Enumeration/Sperre).
    - Ist der Zugang gesperrt (`login_gesperrt_bis` in der Zukunft) → `ModeratorGesperrtError`.
    - Passwort korrekt → Zähler/Sperre zurücksetzen, Moderator zurückgeben.
    - Passwort falsch → Fehlversuchszähler erhöhen; ab `moderator_login_max_fehlversuche`
      wird der Zugang für `moderator_login_sperre_minuten` gesperrt → None.
    """
    moderator = (
        await db.execute(select(Moderator).where(Moderator.username == username))
    ).scalar_one_or_none()
    if moderator is None:
        return None

    jetzt = datetime.now(timezone.utc)
    veraendert = False
    gesperrt_bis = _als_utc(moderator.login_gesperrt_bis) if moderator.login_gesperrt_bis else None
    if gesperrt_bis is not None and gesperrt_bis > jetzt:
        raise ModeratorGesperrtError(int((gesperrt_bis - jetzt).total_seconds()) + 1)
    if gesperrt_bis is not None:  # Sperre abgelaufen
        moderator.login_gesperrt_bis = None
        moderator.login_fehlversuche = 0
        veraendert = True

    if verify_secret(passwort, moderator.passwort_hash):
        if moderator.login_fehlversuche or moderator.login_gesperrt_bis is not None:
            moderator.login_fehlversuche = 0
            moderator.login_gesperrt_bis = None
            veraendert = True
        if veraendert:
            await db.commit()
        return moderator

    max_fehlversuche = int(await config_service.get(db, "moderator_login_max_fehlversuche", 5))
    sperre_minuten = int(await config_service.get(db, "moderator_login_sperre_minuten", 15))
    moderator.login_fehlversuche = (moderator.login_fehlversuche or 0) + 1
    if max_fehlversuche > 0 and moderator.login_fehlversuche >= max_fehlversuche:
        moderator.login_gesperrt_bis = jetzt + timedelta(minutes=sperre_minuten)
        moderator.login_fehlversuche = 0
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
    db: AsyncSession, username: str, passwort: str, rolle: str = "admin", email: str | None = None
) -> Moderator:
    moderator = Moderator(
        username=username,
        passwort_hash=hash_secret(passwort),
        rolle=rolle,
        email=_email_normalisieren(email),
    )
    db.add(moderator)
    await db.commit()
    await db.refresh(moderator)
    return moderator


async def moderator_email_setzen(db: AsyncSession, moderator: Moderator, email: str | None) -> Moderator:
    moderator.email = _email_normalisieren(email)
    await db.commit()
    await db.refresh(moderator)
    return moderator


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
