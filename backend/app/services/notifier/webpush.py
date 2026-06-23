import json

import structlog
from pywebpush import WebPushException, webpush
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.push_subscription import PushSubscription
from app.services.notifier.base import Notifier

logger = structlog.get_logger(__name__)


class WebPushNotifier(Notifier):
    name = "webpush"

    async def send(self, db: AsyncSession, betreff: str, nachricht: str) -> None:
        result = await db.execute(select(PushSubscription))
        subscriptions = list(result.scalars().all())
        payload = json.dumps({"titel": betreff, "nachricht": nachricht})
        veraltete: list[PushSubscription] = []
        for sub in subscriptions:
            try:
                webpush(
                    subscription_info={
                        "endpoint": sub.endpoint,
                        "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
                    },
                    data=payload,
                    vapid_private_key=settings.notifier_webpush_vapid_private_key,
                    vapid_claims={"sub": settings.notifier_webpush_vapid_subject},
                )
            except WebPushException as exc:
                status_code = getattr(exc.response, "status_code", None)
                if status_code in (404, 410):
                    veraltete.append(sub)
                else:
                    logger.warning("webpush_versand_fehlgeschlagen", exc_info=True)
        for sub in veraltete:
            await db.delete(sub)
        if veraltete:
            await db.commit()
