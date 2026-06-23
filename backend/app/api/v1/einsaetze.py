from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.api.deps import CurrentPerson, DbSession, require_geofence, require_modul_aktiv
from app.schemas.einsatz import EinsatzAnlegen, EinsatzOut, TeilnahmeAnlegen, TeilnahmeOut
from app.services import einsatz_service, pdf_service

router = APIRouter(
    prefix="/einsaetze",
    tags=["einsatztagebuch"],
    dependencies=[Depends(require_modul_aktiv("modul_einsatztagebuch_aktiv"))],
)


@router.get("", response_model=list[EinsatzOut], dependencies=[Depends(require_geofence)])
async def einsaetze_liste(db: DbSession) -> list[EinsatzOut]:
    """Das Einsatztagebuch ist ausschließlich im Gerätehaus einsehbar."""
    return await einsatz_service.liste_einsaetze(db)


@router.post(
    "",
    response_model=EinsatzOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_geofence)],
)
async def einsatz_anlegen(db: DbSession, daten: EinsatzAnlegen) -> EinsatzOut:
    return await einsatz_service.einsatz_anlegen(db, daten)


@router.get("/{einsatz_id}", response_model=EinsatzOut, dependencies=[Depends(require_geofence)])
async def einsatz_detail(db: DbSession, einsatz_id: int) -> EinsatzOut:
    einsatz = await einsatz_service.get_einsatz(db, einsatz_id)
    if einsatz is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Einsatz nicht gefunden.")
    return einsatz


@router.get("/{einsatz_id}/pdf", dependencies=[Depends(require_geofence)])
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
    dependencies=[Depends(require_geofence)],
)
async def teilnahme_eintragen(
    db: DbSession, person: CurrentPerson, einsatz_id: int, daten: TeilnahmeAnlegen
) -> TeilnahmeOut:
    einsatz = await einsatz_service.get_einsatz(db, einsatz_id)
    if einsatz is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Einsatz nicht gefunden.")
    return await einsatz_service.teilnahme_eintragen(db, einsatz, person.id, daten)
