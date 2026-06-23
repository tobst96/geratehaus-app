from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.push_subscription import PushSubscription
from app.schemas.push_subscription import PushSubscriptionCreate


async def registrieren(db: AsyncSession, daten: PushSubscriptionCreate) -> None:
    stmt = insert(PushSubscription).values(
        endpoint=daten.endpoint, p256dh=daten.keys.p256dh, auth=daten.keys.auth
    )
    stmt = stmt.on_conflict_do_update(
        index_elements=["endpoint"],
        set_={"p256dh": daten.keys.p256dh, "auth": daten.keys.auth},
    )
    await db.execute(stmt)
    await db.commit()


async def abmelden(db: AsyncSession, endpoint: str) -> None:
    result = await db.execute(select(PushSubscription).where(PushSubscription.endpoint == endpoint))
    sub = result.scalar_one_or_none()
    if sub is not None:
        await db.delete(sub)
        await db.commit()
