from datetime import date, datetime

from fastapi import APIRouter, Response

from app.api.deps import CurrentAdmin, CurrentModerator, DbSession
from app.schemas.buchung import BuchungOut
from app.schemas.dienstbuch import DienstbuchOut
from app.schemas.dienststunden import DienststundenEintragOut
from app.schemas.einsatz import EinsatzOut
from app.schemas.namens_abweichung import NamensAbweichungOut
from app.services import auth_service, moderator_listen_service, pdf_service

router = APIRouter(prefix="/moderator/listen", tags=["moderator:listen"])


@router.get("/einsaetze", response_model=list[EinsatzOut])
async def einsaetze(
    db: DbSession,
    _moderator: CurrentModerator,
    von: datetime | None = None,
    bis: datetime | None = None,
    fahrzeug_id: int | None = None,
    person_id: int | None = None,
    archiviert: bool | None = None,
) -> list[EinsatzOut]:
    return await moderator_listen_service.einsaetze_liste(
        db, von, bis, fahrzeug_id, person_id, archiviert
    )


@router.get("/dienstbuecher", response_model=list[DienstbuchOut])
async def dienstbuecher(
    db: DbSession,
    _moderator: CurrentModerator,
    von: datetime | None = None,
    bis: datetime | None = None,
    person_id: int | None = None,
    archiviert: bool | None = None,
) -> list[DienstbuchOut]:
    return await moderator_listen_service.dienstbuecher_liste(db, von, bis, person_id, archiviert)


@router.get("/dienststunden", response_model=list[DienststundenEintragOut])
async def dienststunden(
    db: DbSession,
    _moderator: CurrentModerator,
    von: date | None = None,
    bis: date | None = None,
    person_id: int | None = None,
    funktion_id: int | None = None,
) -> list[DienststundenEintragOut]:
    return await moderator_listen_service.dienststunden_liste(db, von, bis, person_id, funktion_id)


@router.get("/buchungen", response_model=list[BuchungOut])
async def buchungen(
    db: DbSession,
    _moderator: CurrentModerator,
    von: datetime | None = None,
    bis: datetime | None = None,
    fahrzeug_id: int | None = None,
    person_id: int | None = None,
    status: str | None = None,
) -> list[BuchungOut]:
    return await moderator_listen_service.buchungen_liste(
        db, von, bis, fahrzeug_id, person_id, status
    )


@router.get("/namensabweichungen", response_model=list[NamensAbweichungOut])
async def namensabweichungen(
    db: DbSession, _admin: CurrentAdmin
) -> list[NamensAbweichungOut]:
    return await auth_service.liste_namensabweichungen(db)


def _pdf_response(pdf_bytes: bytes, dateiname: str) -> Response:
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{dateiname}"'},
    )


@router.get("/einsaetze/pdf")
async def einsaetze_pdf(
    db: DbSession,
    _moderator: CurrentModerator,
    von: datetime | None = None,
    bis: datetime | None = None,
    fahrzeug_id: int | None = None,
    person_id: int | None = None,
    archiviert: bool | None = None,
) -> Response:
    rows = await moderator_listen_service.einsaetze_liste(
        db, von, bis, fahrzeug_id, person_id, archiviert
    )
    spalten = [
        {"key": "titel", "label": "Titel"},
        {"key": "zeitpunkt", "label": "Zeitpunkt"},
        {"key": "quelle", "label": "Quelle"},
        {"key": "status", "label": "Status"},
        {"key": "archiviert", "label": "Archiviert"},
    ]
    zeilen = [
        {
            "titel": e.titel,
            "zeitpunkt": e.zeitpunkt.strftime("%d.%m.%Y %H:%M"),
            "quelle": e.quelle,
            "status": e.status,
            "archiviert": "Ja" if e.archiviert else "",
        }
        for e in rows
    ]
    pdf_bytes = await pdf_service.liste_pdf(db, "Einsätze", spalten, zeilen)
    return _pdf_response(pdf_bytes, "einsaetze.pdf")


@router.get("/dienstbuecher/pdf")
async def dienstbuecher_pdf(
    db: DbSession,
    _moderator: CurrentModerator,
    von: datetime | None = None,
    bis: datetime | None = None,
    person_id: int | None = None,
    archiviert: bool | None = None,
) -> Response:
    rows = await moderator_listen_service.dienstbuecher_liste(db, von, bis, person_id, archiviert)
    spalten = [
        {"key": "titel", "label": "Titel"},
        {"key": "eroeffnet_am", "label": "Eröffnet am"},
        {"key": "archiviert", "label": "Archiviert"},
    ]
    zeilen = [
        {
            "titel": d.titel,
            "eroeffnet_am": d.eroeffnet_am.strftime("%d.%m.%Y %H:%M"),
            "archiviert": "Ja" if d.archiviert else "",
        }
        for d in rows
    ]
    pdf_bytes = await pdf_service.liste_pdf(db, "Dienstbücher", spalten, zeilen)
    return _pdf_response(pdf_bytes, "dienstbuecher.pdf")


@router.get("/dienststunden/pdf")
async def dienststunden_pdf(
    db: DbSession,
    _moderator: CurrentModerator,
    von: date | None = None,
    bis: date | None = None,
    person_id: int | None = None,
    funktion_id: int | None = None,
) -> Response:
    rows = await moderator_listen_service.dienststunden_liste(db, von, bis, person_id, funktion_id)
    spalten = [
        {"key": "person", "label": "Name"},
        {"key": "funktion", "label": "Funktion"},
        {"key": "stunden", "label": "Stunden"},
        {"key": "datum", "label": "Datum"},
    ]
    zeilen = [
        {
            "person": d.person.name,
            "funktion": d.funktion.name,
            "stunden": d.stunden,
            "datum": d.datum.strftime("%d.%m.%Y"),
        }
        for d in rows
    ]
    pdf_bytes = await pdf_service.liste_pdf(db, "Dienststunden", spalten, zeilen)
    return _pdf_response(pdf_bytes, "dienststunden.pdf")


@router.get("/buchungen/pdf")
async def buchungen_pdf(
    db: DbSession,
    _moderator: CurrentModerator,
    von: datetime | None = None,
    bis: datetime | None = None,
    fahrzeug_id: int | None = None,
    person_id: int | None = None,
    status: str | None = None,
) -> Response:
    rows = await moderator_listen_service.buchungen_liste(
        db, von, bis, fahrzeug_id, person_id, status
    )
    spalten = [
        {"key": "fahrzeug", "label": "Fahrzeug"},
        {"key": "von", "label": "Von"},
        {"key": "bis", "label": "Bis"},
        {"key": "zweck", "label": "Zweck"},
        {"key": "verantwortlich", "label": "Verantwortlich"},
        {"key": "status", "label": "Status"},
    ]
    zeilen = [
        {
            "fahrzeug": b.fahrzeug.name,
            "von": b.von.strftime("%d.%m.%Y %H:%M"),
            "bis": b.bis.strftime("%d.%m.%Y %H:%M"),
            "zweck": b.zweck,
            "verantwortlich": b.verantwortliche_person.name,
            "status": b.status,
        }
        for b in rows
    ]
    pdf_bytes = await pdf_service.liste_pdf(db, "Fahrzeugbuchungen", spalten, zeilen)
    return _pdf_response(pdf_bytes, "buchungen.pdf")
