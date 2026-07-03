import secrets
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.kiosk_token import KioskToken
from app.services.config_service import config_service


async def liste(db: AsyncSession) -> list[KioskToken]:
    result = await db.execute(select(KioskToken).order_by(KioskToken.bezeichnung))
    return list(result.scalars().all())


async def anlegen(db: AsyncSession, bezeichnung: str) -> KioskToken:
    kiosk_token = KioskToken(bezeichnung=bezeichnung, token=secrets.token_hex(16))
    db.add(kiosk_token)
    await db.commit()
    await db.refresh(kiosk_token)
    return kiosk_token


async def get(db: AsyncSession, kiosk_token_id: int) -> KioskToken | None:
    result = await db.execute(select(KioskToken).where(KioskToken.id == kiosk_token_id))
    return result.scalar_one_or_none()


async def get_by_token(db: AsyncSession, token: str) -> KioskToken | None:
    result = await db.execute(select(KioskToken).where(KioskToken.token == token))
    return result.scalar_one_or_none()


async def markiere_genutzt(db: AsyncSession, kiosk_token: KioskToken) -> None:
    kiosk_token.last_used_at = datetime.utcnow()
    await db.commit()


async def set_startseite_module(
    db: AsyncSession, kiosk_token: KioskToken, keys: list[str] | None
) -> KioskToken:
    """Setzt die pro-Kiosk Startseiten-Module (None = globale Einstellung)."""
    kiosk_token.startseite_module = keys
    await db.commit()
    await db.refresh(kiosk_token)
    return kiosk_token


async def effektive_startseite_module(db: AsyncSession, kiosk_token: KioskToken) -> list[str]:
    """Welche Feature-Module auf DIESER Kiosk-Startseite erscheinen: nur aktive,
    mitgliederseitige Module; pro Kiosk gewählt (falls gesetzt) sonst nach der
    globalen Einstellung `modul_<key>_startseite`."""
    from app.services import feature_modul_service

    gewaehlt = kiosk_token.startseite_module
    ergebnis: list[str] = []
    for m in feature_modul_service.FEATURE_MODULE:
        if not m.mitgliederseitig:
            continue
        if not await feature_modul_service.ist_aktiv(db, m.key):
            continue
        if gewaehlt is None:
            sichtbar = bool(await config_service.get(db, f"modul_{m.key}_startseite", False))
        else:
            sichtbar = m.key in gewaehlt
        if sichtbar:
            ergebnis.append(m.key)
    return ergebnis


async def loeschen(db: AsyncSession, kiosk_token: KioskToken) -> None:
    await db.delete(kiosk_token)
    await db.commit()
