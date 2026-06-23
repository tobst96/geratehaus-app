import httpx
import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.services.notifier.base import Notifier

logger = structlog.get_logger(__name__)


class TelegramNotifier(Notifier):
    name = "telegram"

    async def send(self, db: AsyncSession, betreff: str, nachricht: str) -> None:
        url = f"https://api.telegram.org/bot{settings.notifier_telegram_bot_token}/sendMessage"
        text = f"*{betreff}*\n{nachricht}"
        async with httpx.AsyncClient(timeout=10) as client:
            for chat_id in settings.notifier_telegram_chat_ids_list:
                try:
                    response = await client.post(
                        url, json={"chat_id": chat_id, "text": text, "parse_mode": "Markdown"}
                    )
                    response.raise_for_status()
                except httpx.HTTPError:
                    logger.warning("telegram_versand_fehlgeschlagen", chat_id=chat_id, exc_info=True)
