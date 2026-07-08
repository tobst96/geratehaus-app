from fastapi import APIRouter, Depends, status

from app.api.deps import DbSession
from app.core.rate_limit import rate_limit
from app.schemas.push_subscription import PushSubscriptionCreate, VapidPublicKeyOut
from app.services import push_subscription_service
from app.services.config_service import config_service

router = APIRouter(prefix="/push", tags=["push"])


@router.get("/vapid-public-key", response_model=VapidPublicKeyOut)
async def vapid_public_key(db: DbSession) -> VapidPublicKeyOut:
    key = await config_service.get(db, "notifier_webpush_vapid_public_key", "")
    return VapidPublicKeyOut(public_key=key)


@router.post(
    "/subscribe", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(rate_limit(30, 60))]
)
async def subscribe(db: DbSession, daten: PushSubscriptionCreate) -> None:
    await push_subscription_service.registrieren(db, daten)


@router.post(
    "/unsubscribe", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(rate_limit(30, 60))]
)
async def unsubscribe(db: DbSession, endpoint: str) -> None:
    await push_subscription_service.abmelden(db, endpoint)
