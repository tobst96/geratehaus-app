from abc import ABC, abstractmethod

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

logger = structlog.get_logger(__name__)


class Notifier(ABC):
    """Gemeinsames Interface für alle Benachrichtigungskanäle. Jeder Kanal
    wird unabhängig über die .env aktiviert/deaktiviert; mehrere können
    gleichzeitig aktiv sein. `db` wird durchgereicht, weil Web Push die
    Empfänger (Subscriptions) aus der Datenbank lädt; Telegram/E-Mail
    ignorieren den Parameter."""

    name: str

    @abstractmethod
    async def send(self, db: AsyncSession, betreff: str, nachricht: str) -> None: ...
