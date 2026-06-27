"""Rendert HTML-E-Mails im Design der eingestellten Website (Logo, Primär-/
Akzentfarbe aus app_config) – analog zu pdf_service.py, das dasselbe für
PDF-Exporte macht. Wird als Alternative neben dem Plaintext-Inhalt
versendet (multipart/alternative), nie als Ersatz dafür."""

import base64
from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.config_service import config_service

_TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates" / "email"
_env = Environment(loader=FileSystemLoader(str(_TEMPLATES_DIR)), autoescape=True)


async def render_html(
    db: AsyncSession,
    betreff: str,
    nachricht: str,
    aktionen: list[dict[str, str]] | None = None,
) -> str:
    """`aktionen` ist für künftige Mails mit Buttons gedacht (z. B.
    Fahrzeugbuchung annehmen/ablehnen direkt aus der Mail), je Eintrag
    `{"label": ..., "url": ..., "farbe": "#..."}`. Aktuell von keinem
    Aufrufer befüllt."""
    organisation_name = await config_service.get(db, "organisation_name", "Meine Feuerwehr")
    farbe_primaer = await config_service.get(db, "farbe_primaer", "#FFA633")
    farbe_akzent = await config_service.get(db, "farbe_akzent", "#1A1A1A")
    logo_url = await config_service.get(db, "logo_url", "")
    basis_url = str(await config_service.get(db, "oeffentliche_basis_url", "")).rstrip("/")
    logo_absolut = f"{basis_url}{logo_url}" if logo_url and basis_url else None

    kontext: dict[str, Any] = {
        "organisation_name": organisation_name,
        "farbe_primaer": farbe_primaer,
        "farbe_akzent": farbe_akzent,
        "logo_url": logo_absolut,
        "betreff": betreff,
        "absaetze": nachricht.splitlines(),
        "aktionen": aktionen or [],
    }
    return _env.get_template("basis.html").render(**kontext)


async def render_barcode_html(
    db: AsyncSession,
    person_name: str,
    png_bytes: bytes,
    ablauf_datum: str | None,
    intro_text: str,
) -> str:
    organisation_name = await config_service.get(db, "organisation_name", "Meine Feuerwehr")
    farbe_primaer = await config_service.get(db, "farbe_primaer", "#FFA633")
    farbe_akzent = await config_service.get(db, "farbe_akzent", "#1A1A1A")
    logo_url = await config_service.get(db, "logo_url", "")
    basis_url = str(await config_service.get(db, "oeffentliche_basis_url", "")).rstrip("/")
    logo_absolut = f"{basis_url}{logo_url}" if logo_url and basis_url else None
    barcode_data_uri = f"data:image/png;base64,{base64.b64encode(png_bytes).decode()}"

    kontext: dict[str, Any] = {
        "organisation_name": organisation_name,
        "farbe_primaer": farbe_primaer,
        "farbe_akzent": farbe_akzent,
        "logo_url": logo_absolut,
        "person_name": person_name,
        "barcode_data_uri": barcode_data_uri,
        "ablauf_datum": ablauf_datum,
        "intro_text": intro_text,
    }
    return _env.get_template("barcode.html").render(**kontext)
