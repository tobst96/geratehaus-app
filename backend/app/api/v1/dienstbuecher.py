from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.api.deps import CurrentPerson, DbSession, require_modul_aktiv
from app.schemas.dienstbuch import (
    DienstbuchAnlegen,
    DienstbuchOut,
    TeilnehmerAktualisieren,
    TeilnehmerAnlegen,
    TeilnehmerOut,
)
from app.services import dienstbuch_service, pdf_service

router = APIRouter(
    prefix="/dienstbuecher",
    tags=["dienstbuch"],
    dependencies=[Depends(require_modul_aktiv("modul_dienstbuch_aktiv")), ],
)


@router.get("/letzte", response_model=list[DienstbuchOut])
async def letzte(db: DbSession) -> list[DienstbuchOut]:
    """Dienstbücher der letzten X Stunden (Zeitfenster aus app_config)."""
    return await dienstbuch_service.letzte_dienstbuecher(db)


@router.post("", response_model=DienstbuchOut, status_code=status.HTTP_201_CREATED)
async def anlegen(db: DbSession, daten: DienstbuchAnlegen) -> DienstbuchOut:
    return await dienstbuch_service.dienstbuch_anlegen(db, daten)


@router.get("/{dienstbuch_id}", response_model=DienstbuchOut)
async def detail(db: DbSession, dienstbuch_id: int) -> DienstbuchOut:
    dienstbuch = await dienstbuch_service.get_dienstbuch(db, dienstbuch_id)
    if dienstbuch is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Dienstbuch nicht gefunden."
        )
    return dienstbuch


@router.get("/{dienstbuch_id}/pdf")
async def dienstbuch_pdf(db: DbSession, dienstbuch_id: int) -> Response:
    dienstbuch = await dienstbuch_service.get_dienstbuch(db, dienstbuch_id)
    if dienstbuch is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Dienstbuch nicht gefunden."
        )
    pdf_bytes = await pdf_service.dienstbuch_pdf(db, dienstbuch)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="dienstbuch-{dienstbuch.id}.pdf"'},
    )


@router.post("/{dienstbuch_id}/teilnehmer", response_model=TeilnehmerOut)
async def teilnehmer_eintragen(
    db: DbSession, person: CurrentPerson, dienstbuch_id: int, daten: TeilnehmerAnlegen
) -> TeilnehmerOut:
    dienstbuch = await dienstbuch_service.get_dienstbuch(db, dienstbuch_id)
    if dienstbuch is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Dienstbuch nicht gefunden."
        )
    return await dienstbuch_service.teilnehmer_eintragen(db, dienstbuch, person.id, daten)


@router.put("/{dienstbuch_id}/teilnehmer/{teilnehmer_id}", response_model=TeilnehmerOut, dependencies=[])
async def teilnehmer_aktualisieren(
    db: DbSession, dienstbuch_id: int, teilnehmer_id: int, daten: TeilnehmerAktualisieren
) -> TeilnehmerOut:
    """Atemschutzminuten lassen sich erst nach dem Dienst nachtragen – daher
    direkt in der Teilnehmerliste editierbar statt beim Scannen abgefragt."""
    teilnehmer = await dienstbuch_service.get_teilnehmer(db, dienstbuch_id, teilnehmer_id)
    if teilnehmer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teilnehmer nicht gefunden.")
    return await dienstbuch_service.teilnehmer_aktualisieren(db, teilnehmer, daten)
