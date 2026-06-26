import secrets
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.kiosk_token import KioskToken


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


async def loeschen(db: AsyncSession, kiosk_token: KioskToken) -> None:
    await db.delete(kiosk_token)
    await db.commit()
