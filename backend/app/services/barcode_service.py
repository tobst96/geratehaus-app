import io
import secrets
import structlog
from datetime import datetime, timedelta

import barcode as barcode_lib
from barcode.writer import ImageWriter
from PIL import Image, ImageDraw, ImageFont
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.barcode_token import BarcodeToken
from app.models.person import Person
from app.services.config_service import config_service

logger = structlog.get_logger(__name__)

_FONT_REGULAR = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
_FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


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
    from app.services import email_template_service, stammdaten_service

    email_aktiv = await config_service.get(db, "notifier_email_aktiv", False)
    if not email_aktiv:
        return
    neuer = await barcode_erneuern(db, person.id)
    platzierung = await stammdaten_service.platzierung_nach_punkten(db, person.id)
    karte = await render_karte_png(db, neuer.token, person.name, neuer.ablauf_am, platzierung=platzierung)
    ablauf_datum = neuer.ablauf_am.strftime("%d.%m.%Y") if neuer.ablauf_am else None
    html = await email_template_service.render_barcode_html(
        db,
        person_name=person.name,
        png_bytes=karte,
        ablauf_datum=ablauf_datum,
        intro_text="Dein bisheriger Barcode ist abgelaufen. Hier ist dein neuer Barcode – scanne ihn an der Kiosk-Station.",
    )
    await EmailNotifier().barcode_mail_versenden(
        db,
        empfaenger=person.email,
        betreff="Dein neuer Barcode für Gerätehaus.app",
        plaintext=f"Hallo {person.name},\n\ndein bisheriger Barcode ist abgelaufen. Deinen neuen Barcode findest du im Anhang dieser Mail.\n\nGültig bis: {ablauf_datum or '–'}",
        html=html,
        png=karte,
        person_id=person.id,
    )
    logger.info("barcode_erneuerungsmail_gesendet", person_id=person.id)


def render_png(token: str) -> bytes:
    """Rendert einen Token als Code128-Strichcode-PNG (reiner Strichcode, für
    interne Weiterverarbeitung – für Mails render_karte_png() verwenden)."""
    code128 = barcode_lib.get("code128", token, writer=ImageWriter())
    puffer = io.BytesIO()
    code128.write(puffer, options={"write_text": False, "module_height": 10})
    return puffer.getvalue()


async def render_karte_png(
    db: AsyncSession,
    token: str,
    person_name: str,
    ablauf_am: datetime | None,
    platzierung: int | None = None,
) -> bytes:
    """Rendert eine speicherbare Mitgliedskarte als PNG im Org-Design:
    farbiger Header mit Org-Name, Barcode, Name, Ablaufdatum und optionalem Rang."""
    org_name = await config_service.get(db, "organisation_name", "Gerätehaus.app")
    farbe_hex = str(await config_service.get(db, "farbe_primaer", "#FFA633")).lstrip("#")
    primaer = (int(farbe_hex[0:2], 16), int(farbe_hex[2:4], 16), int(farbe_hex[4:6], 16))

    # Barcode als Rohbild laden
    bc_bytes = render_png(token)
    bc_img = Image.open(io.BytesIO(bc_bytes)).convert("RGB")

    # Karten-Abmessungen
    W = 800
    HEADER_H = 88
    PADDING = 28
    BC_MAX_W = W - PADDING * 2

    bc_ratio = bc_img.height / bc_img.width
    bc_w = min(BC_MAX_W, bc_img.width)
    bc_h = int(bc_w * bc_ratio)
    bc_resized = bc_img.resize((bc_w, bc_h), Image.LANCZOS)

    NAME_AREA = 48
    DATE_AREA = 32
    BOTTOM_PAD = 24
    H = HEADER_H + PADDING + bc_h + PADDING + NAME_AREA + DATE_AREA + BOTTOM_PAD

    # Fonts
    font_org = ImageFont.truetype(_FONT_BOLD, 22)
    font_name = ImageFont.truetype(_FONT_BOLD, 30)
    font_date = ImageFont.truetype(_FONT_REGULAR, 16)
    font_rang = ImageFont.truetype(_FONT_BOLD, 18)
    font_rang_label = ImageFont.truetype(_FONT_REGULAR, 12)

    # Karte aufbauen
    card = Image.new("RGB", (W, H), (255, 255, 255))
    draw = ImageDraw.Draw(card)

    # Header
    draw.rectangle([(0, 0), (W, HEADER_H)], fill=primaer)
    org_bbox = draw.textbbox((0, 0), org_name, font=font_org)
    org_h = org_bbox[3] - org_bbox[1]
    draw.text((PADDING, (HEADER_H - org_h) // 2), org_name, fill=(255, 255, 255), font=font_org)

    # Rang rechts im Header
    if platzierung is not None:
        rang_text = f"#{platzierung}"
        rang_bbox = draw.textbbox((0, 0), rang_text, font=font_rang)
        rang_w = rang_bbox[2] - rang_bbox[0]
        label_text = "Platz"
        label_bbox = draw.textbbox((0, 0), label_text, font=font_rang_label)
        label_w = label_bbox[2] - label_bbox[0]
        block_w = max(rang_w, label_w)
        block_x = W - PADDING - block_w
        draw.text((block_x + (block_w - label_w) // 2, 14), label_text, fill=(255, 255, 255, 180), font=font_rang_label)
        draw.text((block_x + (block_w - rang_w) // 2, 28), rang_text, fill=(255, 255, 255), font=font_rang)

    # Trennlinie
    draw.line([(0, HEADER_H), (W, HEADER_H)], fill=(*primaer, 255), width=3)

    # Barcode
    bc_x = (W - bc_w) // 2
    bc_y = HEADER_H + PADDING
    card.paste(bc_resized, (bc_x, bc_y))

    # Name
    name_bbox = draw.textbbox((0, 0), person_name, font=font_name)
    name_w = name_bbox[2] - name_bbox[0]
    name_y = bc_y + bc_h + PADDING - 4
    draw.text(((W - name_w) // 2, name_y), person_name, fill=(20, 20, 20), font=font_name)

    # Ablaufdatum
    if ablauf_am:
        ablauf_str = f"Gültig bis {ablauf_am.strftime('%d.%m.%Y')}"
        date_bbox = draw.textbbox((0, 0), ablauf_str, font=font_date)
        date_w = date_bbox[2] - date_bbox[0]
        date_y = name_y + NAME_AREA
        draw.text(((W - date_w) // 2, date_y), ablauf_str, fill=(130, 130, 130), font=font_date)

    # Gerundete Ecken
    radius = 18
    mask = Image.new("L", (W, H), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle([(0, 0), (W - 1, H - 1)], radius=radius, fill=255)
    result = Image.new("RGBA", (W, H), (255, 255, 255, 0))
    result.paste(card, mask=mask)

    out = io.BytesIO()
    result.save(out, format="PNG", optimize=True)
    return out.getvalue()
