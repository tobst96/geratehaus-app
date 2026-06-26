import io
import secrets
from datetime import datetime, timedelta

import barcode as barcode_lib
from barcode.writer import ImageWriter
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.barcode_token import BarcodeToken
from app.services.config_service import config_service


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


def render_png(token: str) -> bytes:
    """Rendert einen Token als Code128-Strichcode-PNG (z. B. für Druck oder
    E-Mail-Anhang)."""
    code128 = barcode_lib.get("code128", token, writer=ImageWriter())
    puffer = io.BytesIO()
    code128.write(puffer, options={"write_text": False, "module_height": 10})
    return puffer.getvalue()
