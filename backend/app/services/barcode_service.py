import io
import secrets
import structlog
from datetime import datetime, timedelta

import barcode as barcode_lib
from barcode.writer import ImageWriter
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.barcode_token import BarcodeToken
from app.models.person import Person
from app.services.config_service import config_service

logger = structlog.get_logger(__name__)


async def token_fuer_person(db: AsyncSession, person_id: int) -> BarcodeToken:
    """Liefert den bestehenden Barcode-Token einer Person oder erzeugt einen
    neuen mit der konfigurierten Gültigkeitsdauer (Einstellungen > Barcodes)."""
    result = await db.execute(select(BarcodeToken).where(BarcodeToken.person_id == person_id))
    bestehender = result.scalar_one_or_none()
    if bestehender is not None:
        return bestehender

    token = secrets.token_hex(8)
    gueltigkeit_tage = await config_service.get(db, "barcode_gueltigkeit_tage", 730)
    ablauf_am = datetime.utcnow() + timedelta(days=gueltigkeit_tage)
    barcode_token = BarcodeToken(person_id=person_id, token=token, ablauf_am=ablauf_am)
    db.add(barcode_token)
    await db.commit()
    return barcode_token


async def barcode_erneuern(db: AsyncSession, person_id: int) -> BarcodeToken:
    """Löscht den bestehenden Token und erstellt einen frischen (für abgelaufene Barcodes)."""
    result = await db.execute(select(BarcodeToken).where(BarcodeToken.person_id == person_id))
    alter = result.scalar_one_or_none()
    if alter is not None:
        await db.delete(alter)
        await db.flush()
    token = secrets.token_hex(8)
    gueltigkeit_tage = await config_service.get(db, "barcode_gueltigkeit_tage", 730)
    ablauf_am = datetime.utcnow() + timedelta(days=gueltigkeit_tage)
    neuer = BarcodeToken(person_id=person_id, token=token, ablauf_am=ablauf_am)
    db.add(neuer)
    await db.commit()
    return neuer


async def abgelaufene_personen_fuer_erneuerung(db: AsyncSession) -> list[tuple[BarcodeToken, Person]]:
    """Gibt alle (Token, Person)-Paare zurück, deren Barcode abgelaufen ist
    und die eine E-Mail mit aktivierten Benachrichtigungen haben."""
    stmt = (
        select(BarcodeToken, Person)
        .join(Person, BarcodeToken.person_id == Person.id)
        .where(BarcodeToken.ablauf_am < datetime.utcnow())
        .where(Person.email.isnot(None))
        .where(Person.benachrichtigungen_aktiv.is_(True))
    )
    result = await db.execute(stmt)
    return list(result.all())


async def erneuerung_mail_senden(db: AsyncSession, person: Person) -> None:
    """Erstellt einen neuen Barcode für die Person und sendet ihn per E-Mail.
    Setzt email_aktiv in app_config voraus – wenn nicht aktiv, wird nichts versendet."""
    from app.services.notifier.email import EmailNotifier  # lokaler Import vermeidet Zirkel
    from app.services import email_template_service

    email_aktiv = await config_service.get(db, "notifier_email_aktiv", False)
    if not email_aktiv:
        return
    neuer = await barcode_erneuern(db, person.id)
    png = render_png(neuer.token)
    ablauf_datum = neuer.ablauf_am.strftime("%d.%m.%Y") if neuer.ablauf_am else None
    html = await email_template_service.render_barcode_html(
        db,
        person_name=person.name,
        png_bytes=png,
        ablauf_datum=ablauf_datum,
        intro_text="Dein bisheriger Barcode ist abgelaufen. Hier ist dein neuer Barcode – scanne ihn an der Kiosk-Station oder drucke ihn aus.",
    )
    await EmailNotifier().barcode_mail_versenden(
        db,
        empfaenger=person.email,
        betreff="Dein neuer Barcode für Gerätehaus.app",
        plaintext=f"Hallo {person.name},\n\ndein bisheriger Barcode ist abgelaufen. Deinen neuen Barcode findest du im Anhang dieser Mail.\n\nGültig bis: {ablauf_datum or '–'}",
        html=html,
        png=png,
        person_id=person.id,
    )
    logger.info("barcode_erneuerungsmail_gesendet", person_id=person.id)


def render_png(token: str) -> bytes:
    """Rendert einen Token als Code128-Strichcode-PNG (z. B. für Druck oder
    E-Mail-Anhang)."""
    code128 = barcode_lib.get("code128", token, writer=ImageWriter())
    puffer = io.BytesIO()
    code128.write(puffer, options={"write_text": False, "module_height": 10})
    return puffer.getvalue()
