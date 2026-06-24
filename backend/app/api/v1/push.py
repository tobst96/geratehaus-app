from fastapi import APIRouter, status

from app.api.deps import DbSession
from app.schemas.push_subscription import PushSubscriptionCreate, VapidPublicKeyOut
from app.services import push_subscription_service
from app.services.config_service import config_service

router = APIRouter(prefix="/push", tags=["push"])


@router.get("/vapid-public-key", response_model=VapidPublicKeyOut)
async def vapid_public_key(db: DbSession) -> VapidPublicKeyOut:
    key = await config_service.get(db, "notifier_webpush_vapid_public_key", "")
    return VapidPublicKeyOut(public_key=key)


@router.post("/subscribe", status_code=status.HTTP_204_NO_CONTENT)
async def subscribe(db: DbSession, daten: PushSubscriptionCreate) -> None:
    await push_subscription_service.registrieren(db, daten)


@router.post("/unsubscribe", status_code=status.HTTP_204_NO_CONTENT)
async def unsubscribe(db: DbSession, endpoint: str) -> None:
    await push_subscription_service.abmelden(db, endpoint)
