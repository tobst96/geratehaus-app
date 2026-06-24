from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.api.deps import CurrentModerator, CurrentPerson, DbSession, require_modul_aktiv
from app.schemas.einsatz import (
    EinsatzAnlegen,
    EinsatzEreignisOut,
    EinsatzOut,
    EinsatzZusatzfelderAktualisieren,
    TeilnahmeAnlegen,
    TeilnahmeOut,
)
from app.schemas.einsatz_feld import EinsatzFeldDefinitionOut
from app.services import einsatz_service, pdf_service, stammdaten_service

router = APIRouter(
    prefix="/einsaetze",
    tags=["einsatztagebuch"],
    dependencies=[Depends(require_modul_aktiv("modul_einsatztagebuch_aktiv"))],
)


@router.get("", response_model=list[EinsatzOut], dependencies=[])
async def einsaetze_liste(db: DbSession) -> list[EinsatzOut]:
    """Das Einsatztagebuch ist ausschließlich im Gerätehaus einsehbar."""
    return await einsatz_service.liste_einsaetze(db)


@router.post(
    "",
    response_model=EinsatzOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[],
)
async def einsatz_anlegen(db: DbSession, daten: EinsatzAnlegen) -> EinsatzOut:
    return await einsatz_service.einsatz_anlegen(db, daten)


@router.get("/feld-definitionen", response_model=list[EinsatzFeldDefinitionOut], dependencies=[])
async def feld_definitionen_liste(db: DbSession) -> list[EinsatzFeldDefinitionOut]:
    """Frei konfigurierte Zusatzfelder (Einsatzleiter, Erste Lage, …) – im
    Gerätehaus ohne Moderator-Login lesbar, damit das Formular gerendert werden kann."""
    return await stammdaten_service.liste_einsatz_felder(db, nur_aktive=True)


@router.get("/{einsatz_id}", response_model=EinsatzOut, dependencies=[])
async def einsatz_detail(db: DbSession, einsatz_id: int) -> EinsatzOut:
    einsatz = await einsatz_service.get_einsatz(db, einsatz_id)
    if einsatz is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Einsatz nicht gefunden.")
    return einsatz


@router.get("/{einsatz_id}/pdf", dependencies=[])
async def einsatz_pdf(db: DbSession, einsatz_id: int) -> Response:
    einsatz = await einsatz_service.get_einsatz(db, einsatz_id)
    if einsatz is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Einsatz nicht gefunden.")
    pdf_bytes = await pdf_service.einsatz_pdf(db, einsatz)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="einsatz-{einsatz.id}.pdf"'},
    )


@router.post(
    "/{einsatz_id}/teilnahme",
    response_model=TeilnahmeOut,
    dependencies=[],
)
async def teilnahme_eintragen(
    db: DbSession, person: CurrentPerson, einsatz_id: int, daten: TeilnahmeAnlegen
) -> TeilnahmeOut:
    einsatz = await einsatz_service.get_einsatz(db, einsatz_id)
    if einsatz is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Einsatz nicht gefunden.")
    return await einsatz_service.teilnahme_eintragen(db, einsatz, person.id, daten)


@router.patch("/{einsatz_id}/zusatzfelder", response_model=EinsatzOut, dependencies=[])
async def zusatzfelder_aktualisieren(
    db: DbSession, einsatz_id: int, daten: EinsatzZusatzfelderAktualisieren
) -> EinsatzOut:
    einsatz = await einsatz_service.get_einsatz(db, einsatz_id)
    if einsatz is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Einsatz nicht gefunden.")
    return await einsatz_service.zusatzfelder_aktualisieren(db, einsatz, daten.zusatzfelder)


@router.get("/{einsatz_id}/timeline", response_model=list[EinsatzEreignisOut], dependencies=[])
async def einsatz_timeline(db: DbSession, einsatz_id: int) -> list[EinsatzEreignisOut]:
    einsatz = await einsatz_service.get_einsatz(db, einsatz_id)
    if einsatz is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Einsatz nicht gefunden.")
    return await einsatz_service.liste_ereignisse(db, einsatz_id)


@router.post("/{einsatz_id}/abschliessen", response_model=EinsatzOut)
async def einsatz_abschliessen(
    db: DbSession, _moderator: CurrentModerator, einsatz_id: int
) -> EinsatzOut:
    """Schließt einen Einsatz ab (Status 'offen' -> 'abgeschlossen'). Nur im
    Moderator-Bereich, da dies bislang nirgendwo automatisch passiert."""
    einsatz = await einsatz_service.get_einsatz(db, einsatz_id)
    if einsatz is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Einsatz nicht gefunden.")
    return await einsatz_service.einsatz_abschliessen(db, einsatz)
