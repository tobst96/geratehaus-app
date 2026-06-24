import httpx
import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.config_service import config_service
from app.services.notifier.base import Notifier

logger = structlog.get_logger(__name__)


class TelegramNotifier(Notifier):
    name = "telegram"

    async def send(self, db: AsyncSession, betreff: str, nachricht: str) -> None:
        bot_token = await config_service.get(db, "notifier_telegram_bot_token", "")
        chat_ids_roh = await config_service.get(db, "notifier_telegram_chat_ids", "")
        chat_ids = [c.strip() for c in chat_ids_roh.split(",") if c.strip()]
        if not bot_token or not chat_ids:
            return

        url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
        text = f"*{betreff}*\n{nachricht}"
        async with httpx.AsyncClient(timeout=10) as client:
            for chat_id in chat_ids:
                try:
                    response = await client.post(
                        url, json={"chat_id": chat_id, "text": text, "parse_mode": "Markdown"}
                    )
                    response.raise_for_status()
                except httpx.HTTPError:
                    logger.warning("telegram_versand_fehlgeschlagen", chat_id=chat_id, exc_info=True)
