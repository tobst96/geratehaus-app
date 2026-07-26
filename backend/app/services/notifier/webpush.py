import base64
import json

import structlog
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec
from pywebpush import WebPushException, webpush
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.push_subscription import PushSubscription
from app.services.config_service import config_service
from app.services.notifier.base import Notifier

logger = structlog.get_logger(__name__)


def generiere_vapid_schluessel() -> tuple[str, str]:
    """Erzeugt ein neues VAPID-Schlüsselpaar (P-256). Rückgabe: (public, private)
    jeweils als Base64URL ohne Padding. Der Public-Key hat genau das Format, das
    der Browser für `applicationServerKey` erwartet (unkomprimierter EC-Punkt,
    65 Byte); der Private-Key (32 Byte Raw) ist das von pywebpush akzeptierte
    Format. So kann kein falsches Format mehr von Hand eingetragen werden."""
    privkey = ec.generate_private_key(ec.SECP256R1())
    private_raw = privkey.private_numbers().private_value.to_bytes(32, "big")
    public_point = privkey.public_key().public_bytes(
        serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint
    )

    def _b64url(roh: bytes) -> str:
        return base64.urlsafe_b64encode(roh).rstrip(b"=").decode()

    return _b64url(public_point), _b64url(private_raw)


class WebPushNotifier(Notifier):
    name = "webpush"

    async def send(self, db: AsyncSession, betreff: str, nachricht: str) -> None:
        vapid_private_key = await config_service.get(db, "notifier_webpush_vapid_private_key", "")
        vapid_subject = await config_service.get(
            db, "notifier_webpush_vapid_subject", "mailto:admin@example.org"
        )
        if not vapid_private_key:
            return

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
                    vapid_private_key=vapid_private_key,
                    vapid_claims={"sub": vapid_subject},
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
