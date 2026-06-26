from email.message import EmailMessage

import aiosmtplib
import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.person import Person
from app.services.config_service import config_service
from app.services.notifier.base import Notifier

logger = structlog.get_logger(__name__)


class EmailNotifier(Notifier):
    name = "email"

    async def send(self, db: AsyncSession, betreff: str, nachricht: str) -> None:
        """Event-Benachrichtigungen gehen an jede Person, die in ihren
        Stammdaten Benachrichtigungen aktiviert und eine E-Mail-Adresse
        hinterlegt hat (Default: aus) – nicht an eine zentrale Adressliste."""
        empfaenger = await self._aktive_personen_emails(db)
        if not empfaenger:
            return
        try:
            await self._versenden(db, betreff, nachricht, empfaenger_liste=empfaenger)
        except (aiosmtplib.SMTPException, OSError):
            logger.warning("email_versand_fehlgeschlagen", exc_info=True)

    async def _aktive_personen_emails(self, db: AsyncSession) -> list[str]:
        result = await db.execute(
            select(Person.email).where(
                Person.benachrichtigungen_aktiv.is_(True), Person.email.is_not(None)
            )
        )
        return [e for e in result.scalars().all() if e]

    async def test_versenden(self, db: AsyncSession) -> None:
        """Wie send(), wirft aber Fehler weiter – anders als bei
        Event-Benachrichtigungen soll die Einstellungen-UI eine konkrete
        Fehlermeldung zur SMTP-Konfiguration anzeigen können. Nutzt bewusst
        die zentrale Empfängeradresse aus den Einstellungen (statt der
        Personen-Adressen), da hier nur die SMTP-Konfiguration geprüft wird."""
        empfaenger_roh = await config_service.get(db, "notifier_email_recipients", "")
        empfaenger = [e.strip() for e in empfaenger_roh.split(",") if e.strip()]
        if not empfaenger:
            raise ValueError("Keine Empfängeradresse in den Einstellungen hinterlegt.")
        await self._versenden(
            db,
            "Testmail von Gerätehaus.app",
            "Das ist eine Testmail. Wenn du sie erhältst, ist die SMTP-Konfiguration korrekt.",
            empfaenger_liste=empfaenger,
        )

    async def pdf_versenden(
        self, db: AsyncSession, betreff: str, nachricht: str, dateiname: str, pdf_inhalt: bytes
    ) -> None:
        """Wie test_versenden(): wirft bei Fehlern weiter, damit der Aufrufer
        (Einsatzabschluss) den Versand in der Timeline protokollieren kann."""
        await self._versenden(db, betreff, nachricht, anhang=(dateiname, pdf_inhalt, "application", "pdf"))

    async def send_an(self, db: AsyncSession, empfaenger: str, betreff: str, nachricht: str) -> None:
        """Wie send(): an eine einzelne, individuelle Adresse statt an die
        global konfigurierte Empfängerliste – z. B. Rückmeldung an die
        anfragende Person einer Fahrzeugbuchung."""
        try:
            await self._versenden(db, betreff, nachricht, empfaenger_liste=[empfaenger])
        except (aiosmtplib.SMTPException, OSError):
            logger.warning("email_versand_fehlgeschlagen", exc_info=True)

    async def send_an_mit_anhang(
        self,
        db: AsyncSession,
        empfaenger: str,
        betreff: str,
        nachricht: str,
        dateiname: str,
        inhalt: bytes,
        maintype: str,
        subtype: str,
    ) -> None:
        """Wie send_an(), zusätzlich mit Datei-Anhang (z. B. Barcode-PNG).
        Wirft Fehler weiter (wie test_versenden), da dies eine gezielte
        Moderator-Aktion ist, deren Erfolg/Fehler zurückgemeldet werden soll."""
        await self._versenden(
            db,
            betreff,
            nachricht,
            anhang=(dateiname, inhalt, maintype, subtype),
            empfaenger_liste=[empfaenger],
        )

    async def _versenden(
        self,
        db: AsyncSession,
        betreff: str,
        nachricht: str,
        anhang: tuple[str, bytes, str, str] | None = None,
        empfaenger_liste: list[str] | None = None,
    ) -> None:
        if empfaenger_liste is not None:
            empfaenger = empfaenger_liste
        else:
            empfaenger_roh = await config_service.get(db, "notifier_email_recipients", "")
            empfaenger = [e.strip() for e in empfaenger_roh.split(",") if e.strip()]
        if not empfaenger:
            raise ValueError("Keine Empfängeradresse in den Einstellungen hinterlegt.")
        message = EmailMessage()
        message["From"] = await config_service.get(db, "notifier_email_from", "geratehaus@example.org")
        message["To"] = ", ".join(empfaenger)
        message["Subject"] = betreff
        message.set_content(nachricht)
        if anhang is not None:
            dateiname, inhalt, maintype, subtype = anhang
            message.add_attachment(inhalt, maintype=maintype, subtype=subtype, filename=dateiname)
        await aiosmtplib.send(
            message,
            hostname=await config_service.get(db, "notifier_email_smtp_host", ""),
            port=await config_service.get(db, "notifier_email_smtp_port", 587),
            username=await config_service.get(db, "notifier_email_smtp_user", "") or None,
            password=await config_service.get(db, "notifier_email_smtp_password", "") or None,
            start_tls=await config_service.get(db, "notifier_email_smtp_use_tls", True),
        )
