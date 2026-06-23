from email.message import EmailMessage

import aiosmtplib
import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.services.notifier.base import Notifier

logger = structlog.get_logger(__name__)


class EmailNotifier(Notifier):
    name = "email"

    async def send(self, db: AsyncSession, betreff: str, nachricht: str) -> None:
        empfaenger = settings.notifier_email_recipients_list
        if not empfaenger:
            return
        message = EmailMessage()
        message["From"] = settings.notifier_email_from
        message["To"] = ", ".join(empfaenger)
        message["Subject"] = betreff
        message.set_content(nachricht)
        try:
            await aiosmtplib.send(
                message,
                hostname=settings.notifier_email_smtp_host,
                port=settings.notifier_email_smtp_port,
                username=settings.notifier_email_smtp_user or None,
                password=settings.notifier_email_smtp_password or None,
                start_tls=settings.notifier_email_smtp_use_tls,
            )
        except (aiosmtplib.SMTPException, OSError):
            logger.warning("email_versand_fehlgeschlagen", exc_info=True)
