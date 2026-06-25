from email.message import EmailMessage

import aiosmtplib
import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.config_service import config_service
from app.services.notifier.base import Notifier

logger = structlog.get_logger(__name__)


class EmailNotifier(Notifier):
    name = "email"

    async def send(self, db: AsyncSession, betreff: str, nachricht: str) -> None:
        try:
            await self._versenden(db, betreff, nachricht)
        except (aiosmtplib.SMTPException, OSError):
            logger.warning("email_versand_fehlgeschlagen", exc_info=True)

    async def test_versenden(self, db: AsyncSession) -> None:
        """Wie send(), wirft aber Fehler weiter – anders als bei
        Event-Benachrichtigungen soll die Einstellungen-UI eine konkrete
        Fehlermeldung zur SMTP-Konfiguration anzeigen können."""
        await self._versenden(
            db,
            "Testmail von Gerätehaus.app",
            "Das ist eine Testmail. Wenn du sie erhältst, ist die SMTP-Konfiguration korrekt.",
        )

    async def _versenden(self, db: AsyncSession, betreff: str, nachricht: str) -> None:
        empfaenger_roh = await config_service.get(db, "notifier_email_recipients", "")
        empfaenger = [e.strip() for e in empfaenger_roh.split(",") if e.strip()]
        if not empfaenger:
            raise ValueError("Keine Empfängeradresse in den Einstellungen hinterlegt.")
        message = EmailMessage()
        message["From"] = await config_service.get(db, "notifier_email_from", "geratehaus@example.org")
        message["To"] = ", ".join(empfaenger)
        message["Subject"] = betreff
        message.set_content(nachricht)
        await aiosmtplib.send(
            message,
            hostname=await config_service.get(db, "notifier_email_smtp_host", ""),
            port=await config_service.get(db, "notifier_email_smtp_port", 587),
            username=await config_service.get(db, "notifier_email_smtp_user", "") or None,
            password=await config_service.get(db, "notifier_email_smtp_password", "") or None,
            start_tls=await config_service.get(db, "notifier_email_smtp_use_tls", True),
        )
