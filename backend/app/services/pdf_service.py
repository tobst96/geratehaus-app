"""PDF-Export mit WeasyPrint. Einheitliches Layout über base.html – Logo und
Organisationsname kommen aus app_config in die Kopfzeile, niemals hartcodiert.
"""

import asyncio
import base64
import mimetypes
from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader
from sqlalchemy.ext.asyncio import AsyncSession
from weasyprint import HTML

from app.core.config import settings
from app.services import stammdaten_service
from app.services.config_service import config_service

_TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates" / "pdf"
_env = Environment(loader=FileSystemLoader(str(_TEMPLATES_DIR)), autoescape=True)


def _logo_data_uri(logo_url: str | None) -> str | None:
    if not logo_url:
        return None
    pfad = Path(settings.upload_dir) / Path(logo_url).name
    if not pfad.exists():
        return None
    mime, _ = mimetypes.guess_type(str(pfad))
    daten = base64.b64encode(pfad.read_bytes()).decode()
    return f"data:{mime or 'image/png'};base64,{daten}"


async def _basis_kontext(db: AsyncSession) -> dict[str, Any]:
    organisation_name = await config_service.get(db, "organisation_name", "Meine Feuerwehr")
    farbe_primaer = await config_service.get(db, "farbe_primaer", "#FFA633")
    farbe_akzent = await config_service.get(db, "farbe_akzent", "#1A1A1A")
    logo_url = await config_service.get(db, "logo_url", "")
    return {
        "organisation_name": organisation_name,
        "farbe_primaer": farbe_primaer,
        "farbe_akzent": farbe_akzent,
        "logo_data_uri": _logo_data_uri(logo_url),
    }


def _render_pdf_sync(html_text: str) -> bytes:
    return HTML(string=html_text, base_url=str(_TEMPLATES_DIR)).write_pdf()


async def _rendern(db: AsyncSession, template_name: str, **kontext: Any) -> bytes:
    basis = await _basis_kontext(db)
    template = _env.get_template(template_name)
    html_text = template.render(**basis, **kontext)
    return await asyncio.to_thread(_render_pdf_sync, html_text)


async def _archiviere(db: AsyncSession, schluessel: str, pdf_bytes: bytes) -> None:
    """Optionales PDF-Archiv im Objektspeicher (S3/MinIO). Late import wegen
    Modul-Reihenfolge; best-effort (wirft nie)."""
    from app.services import backup_service

    await backup_service.archiviere_pdf(db, schluessel, pdf_bytes)


async def einsatz_pdf(db: AsyncSession, einsatz: Any) -> bytes:
    felder = await stammdaten_service.liste_einsatz_felder(db, nur_aktive=True)
    zusatzfelder_anzeige = []
    for f in felder:
        wert = einsatz.zusatzfelder.get(f.schluessel)
        if wert in (None, "", False):
            continue
        zusatzfelder_anzeige.append({"label": f.label, "wert": "Ja" if wert is True else wert})
    pdf = await _rendern(db, "einsatz.html", einsatz=einsatz, zusatzfelder_anzeige=zusatzfelder_anzeige)
    await _archiviere(db, f"einsaetze/einsatz-{getattr(einsatz, 'id', 'x')}.pdf", pdf)
    # MinIO-Modul: Ordner je Einsatz mit aktueller JSON + Bericht-PDF.
    from app.services import minio_service

    await minio_service.einsatz_dokumente(db, einsatz, pdf)
    return pdf


async def dienstbuch_pdf(db: AsyncSession, dienstbuch: Any) -> bytes:
    pdf = await _rendern(db, "dienstbuch.html", dienstbuch=dienstbuch)
    await _archiviere(db, f"dienstbuecher/dienstbuch-{getattr(dienstbuch, 'id', 'x')}.pdf", pdf)
    from app.services import minio_service

    await minio_service.dienstbuch_dokument(db, getattr(dienstbuch, "id", 0), pdf)
    return pdf


async def liste_pdf(
    db: AsyncSession, titel: str, spalten: list[dict[str, str]], zeilen: list[dict[str, Any]]
) -> bytes:
    from datetime import datetime, timezone

    pdf = await _rendern(db, "liste.html", titel=titel, spalten=spalten, zeilen=zeilen)
    stempel = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    await _archiviere(db, f"listen/{titel.lower()}-{stempel}.pdf", pdf)
    return pdf
