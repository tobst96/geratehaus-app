"""PDF-Export mit WeasyPrint. Einheitliches Layout über base.html – Logo und
Organisationsname kommen aus app_config in die Kopfzeile, niemals hartcodiert.
"""

import asyncio
import base64
import mimetypes
from pathlib import Path
from typing import Any

import segno
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


def _nachname_sortierschluessel(person: Any) -> tuple[str, str]:
    """Sortiert Personen ohne gepflegte vorname/nachname-Felder (z. B. reine
    Divera-Importe) über eine Heuristik: letztes Wort im Anzeigenamen als
    Nachname angenommen."""
    nachname = (person.nachname or "").strip()
    vorname = (person.vorname or "").strip()
    if not nachname:
        teile = person.name.strip().split()
        nachname = teile[-1] if teile else person.name
        vorname = " ".join(teile[:-1])
    return (nachname.lower(), vorname.lower())


def _person_anzeige(person: Any) -> str:
    """„Nachname, Vorname" – fällt auf den vollen Anzeigenamen zurück, wenn
    vorname/nachname nicht gepflegt sind (z. B. reine Divera-Importe)."""
    if person.nachname:
        return f"{person.nachname}, {person.vorname or ''}".rstrip(", ")
    return person.name


def _einsatz_teilnahmen_kontext(einsatz: Any) -> dict[str, Any]:
    """Teilnahmen nach Nachname sortiert + zwei Zusatzblöcke fürs PDF-Ende:
    „Bemerkungen" (nur Personen, die tatsächlich eine Bemerkung eingetragen
    haben) und „nach Funktion" gruppiert (Personen ohne Funktion werden dort
    nicht extra aufgelistet) – z. B. damit auf einen Blick sichtbar ist, wer
    welche Funktion (etwa Gruppenführer) innehatte. Reine Funktion aus
    ORM-Daten, ohne DB-Zugriff – auch direkt in Tests nutzbar."""
    teilnahmen = sorted(einsatz.teilnahmen, key=lambda t: _nachname_sortierschluessel(t.person))

    bemerkungen = [
        {"person": _person_anzeige(t.person), "bemerkung": t.bemerkung}
        for t in teilnahmen
        if t.bemerkung
    ]

    nach_funktion: dict[str, list[Any]] = {}
    for t in teilnahmen:
        if t.funktion is None:
            continue
        nach_funktion.setdefault(t.funktion.name, []).append(t.person)
    funktionen_gruppen = [
        {"funktion": label, "personen": ", ".join(_person_anzeige(p) for p in personen)}
        for label, personen in nach_funktion.items()
    ]
    funktionen_gruppen.sort(key=lambda g: g["funktion"].lower())

    return {"teilnahmen": teilnahmen, "bemerkungen": bemerkungen, "funktionen_gruppen": funktionen_gruppen}


async def einsatz_pdf(db: AsyncSession, einsatz: Any) -> bytes:
    from app.services import feature_modul_service

    felder = await stammdaten_service.liste_einsatz_felder(db, nur_aktive=True)
    zusatzfelder_anzeige = []
    for f in felder:
        wert = einsatz.zusatzfelder.get(f.schluessel)
        if wert in (None, "", False):
            continue
        zusatzfelder_anzeige.append({"label": f.label, "wert": "Ja" if wert is True else wert})

    barcode_aktiv = await feature_modul_service.ist_aktiv(db, "barcode")

    pdf = await _rendern(
        db,
        "einsatz.html",
        einsatz=einsatz,
        zusatzfelder_anzeige=zusatzfelder_anzeige,
        # „Ohne Barcode" ist nur relevant, wenn das Barcode-Modul überhaupt aktiv ist –
        # sonst ist Name+PIN ohnehin der Normalfall und die Spalte bedeutungslos.
        zeige_ohne_barcode=barcode_aktiv,
        **_einsatz_teilnahmen_kontext(einsatz),
    )
    await _archiviere(db, f"einsaetze/einsatz-{getattr(einsatz, 'id', 'x')}.pdf", pdf)
    # MinIO-Modul: Ordner je Einsatz mit aktueller JSON + Bericht-PDF.
    from app.services import minio_service

    await minio_service.einsatz_dokumente(db, einsatz, pdf)
    return pdf


async def pressebericht_pdf(db: AsyncSession, einsatz: Any, kontext: dict[str, Any]) -> bytes:
    """Rendert den Pressebericht aus einem vom `pressebericht_service` vorbereiteten
    Kontext (nur die konfigurierten Blöcke). Legt – anders als `einsatz_pdf` – NICHT
    selbst in MinIO ab; das übernimmt der `pressebericht_service` gezielt im
    Einsatz-Ordner unter eigenem Namen."""
    return await _rendern(db, "pressebericht.html", einsatz=einsatz, **kontext)


async def dienstbuch_pdf(db: AsyncSession, dienstbuch: Any) -> bytes:
    from app.services import dienstbuch_service

    felder = await dienstbuch_service.liste_dienstbuch_felder(db, nur_aktive=True)
    zusatzfelder_anzeige = []
    for f in felder:
        wert = dienstbuch.zusatzfelder.get(f.schluessel)
        if wert in (None, "", False):
            continue
        zusatzfelder_anzeige.append({"label": f.label, "wert": "Ja" if wert is True else wert})
    pdf = await _rendern(
        db, "dienstbuch.html", dienstbuch=dienstbuch, zusatzfelder_anzeige=zusatzfelder_anzeige
    )
    await _archiviere(db, f"dienstbuecher/dienstbuch-{getattr(dienstbuch, 'id', 'x')}.pdf", pdf)
    from app.services import minio_service

    await minio_service.dienstbuch_dokument(db, getattr(dienstbuch, "id", 0), pdf)
    return pdf


async def kiosk_link_pdf(db: AsyncSession, kiosk_token: Any) -> bytes:
    """Ausdruckbares Poster für ein Kiosk-Gerät: Logo/Org-Name (Kopf), Gerätename,
    großer QR-Code auf den Kiosk-Link (`/kiosk/<token>`) und eine kurze
    Einrichtungs-Anleitung. QR wird serverseitig aus dem Token erzeugt (segno)."""
    basis_url = str(await config_service.get(db, "oeffentliche_basis_url", "")).rstrip("/")
    kiosk_link = f"{basis_url}/kiosk/{kiosk_token.token}"
    qr_data_uri = segno.make(kiosk_link, error="m").png_data_uri(scale=8, border=2)
    return await _rendern(
        db,
        "kiosk_link.html",
        geraet_name=kiosk_token.bezeichnung,
        kiosk_link=kiosk_link,
        qr_data_uri=qr_data_uri,
    )


async def dienststunden_stempel_pdf(db: AsyncSession, funktion: Any) -> bytes:
    """Ausdruckbares „Stempel"-Poster pro Dienststunden-Funktion: Logo/Org-Name,
    Funktionsname, großer QR-Code auf den dauerhaften Stempel-Link
    (`/dienststunden-stempel/<funktion_id>`) und eine kurze Anleitung. Scan →
    Login → Stunden für heute eintragen (Funktion fest)."""
    basis_url = str(await config_service.get(db, "oeffentliche_basis_url", "")).rstrip("/")
    stempel_link = f"{basis_url}/dienststunden-stempel/{funktion.id}"
    qr_data_uri = segno.make(stempel_link, error="m").png_data_uri(scale=8, border=2)
    return await _rendern(
        db,
        "dienststunden_stempel.html",
        funktion_name=funktion.name,
        stempel_link=stempel_link,
        qr_data_uri=qr_data_uri,
    )


async def liste_pdf(
    db: AsyncSession, titel: str, spalten: list[dict[str, str]], zeilen: list[dict[str, Any]]
) -> bytes:
    from datetime import datetime, timezone

    pdf = await _rendern(db, "liste.html", titel=titel, spalten=spalten, zeilen=zeilen)
    stempel = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    await _archiviere(db, f"listen/{titel.lower()}-{stempel}.pdf", pdf)
    return pdf
