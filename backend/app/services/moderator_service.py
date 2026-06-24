from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_secret
from app.models.moderator import Moderator


async def liste_moderatoren(db: AsyncSession) -> list[Moderator]:
    result = await db.execute(select(Moderator).order_by(Moderator.username))
    return list(result.scalars().all())


async def get_moderator(db: AsyncSession, moderator_id: int) -> Moderator | None:
    result = await db.execute(select(Moderator).where(Moderator.id == moderator_id))
    return result.scalar_one_or_none()


async def get_moderator_by_username(db: AsyncSession, username: str) -> Moderator | None:
    result = await db.execute(select(Moderator).where(Moderator.username == username))
    return result.scalar_one_or_none()


async def moderator_anlegen(db: AsyncSession, username: str, passwort: str) -> Moderator:
    moderator = Moderator(username=username, passwort_hash=hash_secret(passwort), rolle="admin")
    db.add(moderator)
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
