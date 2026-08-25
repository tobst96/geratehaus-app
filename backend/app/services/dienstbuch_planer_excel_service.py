"""Excel-Export/-Import fürs Dienstbuch-Planer-Jahr (Phase 3).

Export: ein Sheet pro Monat, mit Gerätehaus.app-Branding im Kopf und einem
QR-Code je Monat, der den Planer direkt im passenden Monat öffnet
(`/gruppenfuehrer/dienstbuch-planer?jahr=&monat=` - Login/Berechtigung
verlangt die Seite selbst).

Import: liest dieselbe Tabellenstruktur zeilenweise ein (Fehler werden pro
Zeile gesammelt statt abzubrechen - Muster wie beim Personen-CSV-Import) und
legt Entwurfs-Termine an; Zeilen, deren (Datum, Titel) im Jahr bereits
existiert, werden übersprungen (idempotenter Re-Import).
"""

import io
from dataclasses import dataclass
from datetime import date, datetime, time

import segno
from openpyxl import Workbook, load_workbook
from openpyxl.drawing.image import Image as XlsxImage
from openpyxl.styles import Alignment, Font
from openpyxl.utils import get_column_letter
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.dienstbuch_planer import DienstbuchPlanTermin
from app.services import dienstbuch_planer_service, feiertag_service
from app.services.config_service import config_service

MONATSNAMEN = [
    "Januar", "Februar", "März", "April", "Mai", "Juni",
    "Juli", "August", "September", "Oktober", "November", "Dezember",
]

_SPALTEN = ["Datum", "Beginn", "Ende", "Titel", "Beschreibung", "Kategorien", "Status"]
_WERBUNG = "Erstellt mit Gerätehaus.app – der selbst gehosteten Gerätehaus-Verwaltung"


def _zeit_str(t: time | None) -> str:
    return t.strftime("%H:%M") if t else ""


async def jahres_export_xlsx(db: AsyncSession, jahr: int) -> bytes:
    organisation = str(await config_service.get(db, "organisation_name", "Meine Feuerwehr"))
    basis_url = str(await config_service.get(db, "oeffentliche_basis_url", "")).rstrip("/")
    termine = await dienstbuch_planer_service.liste_termine(db, jahr)
    feiertage = await feiertag_service.feiertage_fuer_jahr(db, jahr)

    wb = Workbook()
    wb.remove(wb.active)

    for monat in range(1, 13):
        ws = wb.create_sheet(MONATSNAMEN[monat - 1])
        ws.merge_cells("A1:G1")
        ws["A1"] = f"{organisation} – Jahresdienstplan {jahr} – {MONATSNAMEN[monat - 1]}"
        ws["A1"].font = Font(bold=True, size=14)
        ws.merge_cells("A2:G2")
        ws["A2"] = _WERBUNG
        ws["A2"].font = Font(italic=True, size=9)

        # QR-Code auf den passenden Monat (nur mit konfigurierter Basis-URL).
        naechste_zeile = 4
        if basis_url:
            link = f"{basis_url}/gruppenfuehrer/dienstbuch-planer?jahr={jahr}&monat={monat}"
            png = io.BytesIO()
            segno.make(link, error="m").save(png, kind="png", scale=4, border=2)
            png.seek(0)
            bild = XlsxImage(png)
            ws.add_image(bild, "I1")
            ws["H1"] = "Monat in der App öffnen:"
            ws["H1"].font = Font(size=9)

        kopf_zeile = naechste_zeile
        for spalte, titel in enumerate(_SPALTEN, start=1):
            zelle = ws.cell(row=kopf_zeile, column=spalte, value=titel)
            zelle.font = Font(bold=True)

        zeile = kopf_zeile + 1
        for termin in termine:
            if termin.zieldatum is None or termin.zieldatum.month != monat:
                continue
            ws.cell(row=zeile, column=1, value=termin.zieldatum.strftime("%d.%m.%Y"))
            ws.cell(row=zeile, column=2, value=_zeit_str(termin.uhrzeit))
            ws.cell(row=zeile, column=3, value=_zeit_str(termin.endzeit))
            ws.cell(row=zeile, column=4, value=termin.titel)
            ws.cell(row=zeile, column=5, value=termin.beschreibung or "")
            ws.cell(row=zeile, column=6, value=", ".join(k.name for k in termin.kategorien))
            ws.cell(
                row=zeile, column=7, value="Bestätigt" if termin.status == "bestaetigt" else "Entwurf"
            )
            zeile += 1

        monats_feiertage = [f for f in feiertage if f.datum.month == monat]
        if monats_feiertage:
            zeile += 1
            zelle = ws.cell(row=zeile, column=1, value="Feiertage:")
            zelle.font = Font(bold=True, size=9)
            for feiertag in monats_feiertage:
                zeile += 1
                ws.cell(row=zeile, column=1, value=feiertag.datum.strftime("%d.%m.%Y")).font = Font(size=9)
                ws.cell(row=zeile, column=2, value=feiertag.name).font = Font(size=9)

        for spalte, breite in enumerate((12, 8, 8, 32, 40, 24, 12), start=1):
            ws.column_dimensions[get_column_letter(spalte)].width = breite
        ws["A1"].alignment = Alignment(horizontal="left")

    puffer = io.BytesIO()
    wb.save(puffer)
    return puffer.getvalue()


@dataclass
class ImportErgebnis:
    angelegt: int
    uebersprungen: int
    fehler: list[dict]


def _datum_parsen(wert: object) -> date | None:
    if isinstance(wert, datetime):
        return wert.date()
    if isinstance(wert, date):
        return wert
    if isinstance(wert, str) and wert.strip():
        for muster in ("%d.%m.%Y", "%Y-%m-%d"):
            try:
                return datetime.strptime(wert.strip(), muster).date()
            except ValueError:
                continue
    return None


def _zeit_parsen(wert: object) -> time | None:
    if isinstance(wert, time):
        return wert
    if isinstance(wert, datetime):
        return wert.time()
    if isinstance(wert, str) and wert.strip():
        for muster in ("%H:%M", "%H:%M:%S"):
            try:
                return datetime.strptime(wert.strip(), muster).time()
            except ValueError:
                continue
    return None


async def jahres_import_xlsx(
    db: AsyncSession, inhalt: bytes, jahr: int, akteur_name: str | None
) -> ImportErgebnis:
    """Liest alle Sheets der Export-Struktur ein (Kopfzeile "Datum | Beginn |
    Ende | Titel | ..."), legt fehlende Termine als Entwurf an."""
    try:
        wb = load_workbook(io.BytesIO(inhalt), read_only=True, data_only=True)
    except Exception:
        return ImportErgebnis(angelegt=0, uebersprungen=0, fehler=[{"zeile": 0, "fehler": "Keine gültige Excel-Datei (.xlsx)."}])

    bestehende = {
        (t.zieldatum, t.titel)
        for t in (
            await db.execute(
                select(DienstbuchPlanTermin).where(
                    DienstbuchPlanTermin.jahr == jahr, DienstbuchPlanTermin.zieldatum.isnot(None)
                )
            )
        ).scalars().all()
    }

    angelegt = 0
    uebersprungen = 0
    fehler: list[dict] = []

    from app.schemas.dienstbuch_planer import PlanTerminAnlegen

    for ws in wb.worksheets:
        kopf_gefunden = False
        for index, zeile in enumerate(ws.iter_rows(values_only=True), start=1):
            werte = list(zeile) + [None] * (7 - len(zeile))
            if not kopf_gefunden:
                if werte[0] == "Datum" and werte[3] == "Titel":
                    kopf_gefunden = True
                continue
            if all(w in (None, "") for w in werte[:5]):
                continue
            if isinstance(werte[0], str) and werte[0].strip().startswith("Feiertage"):
                break

            datum = _datum_parsen(werte[0])
            titel = str(werte[3] or "").strip()
            if datum is None or not titel:
                fehler.append(
                    {"zeile": index, "fehler": f"{ws.title}: Datum oder Titel fehlt/ungültig."}
                )
                continue
            if datum.year != jahr:
                fehler.append(
                    {"zeile": index, "fehler": f"{ws.title}: Datum {datum} liegt nicht im Jahr {jahr}."}
                )
                continue
            if (datum, titel) in bestehende:
                uebersprungen += 1
                continue

            beginn = _zeit_parsen(werte[1])
            ende = _zeit_parsen(werte[2]) if beginn else None
            await dienstbuch_planer_service.termin_anlegen(
                db,
                PlanTerminAnlegen(
                    titel=titel,
                    beschreibung=str(werte[4]).strip() if werte[4] else None,
                    zieldatum=datum,
                    uhrzeit=beginn,
                    endzeit=ende,
                ),
                akteur_name,
            )
            bestehende.add((datum, titel))
            angelegt += 1

    return ImportErgebnis(angelegt=angelegt, uebersprungen=uebersprungen, fehler=fehler)
