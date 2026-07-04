from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.api.deps import CurrentModerator, CurrentPerson, DbSession, require_modul_aktiv
from app.schemas.dienstbuch import (
    DienstbuchAnlegen,
    DienstbuchOut,
    RelevanteDiensteEintrag,
    RelevantSetzen,
    TeilnehmerAktualisieren,
    TeilnehmerAnlegen,
    TeilnehmerOut,
)
from app.schemas.dienstbuch_reservierung import DienstbuchReservierungOut
from app.services import dienstbuch_reservierung_service, dienstbuch_service, pdf_service

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


@router.get("/relevante-uebersicht", response_model=list[RelevanteDiensteEintrag])
async def relevante_uebersicht(
    db: DbSession,
    _moderator: CurrentModerator,
    von: date | None = None,
    bis: date | None = None,
) -> list[RelevanteDiensteEintrag]:
    """Anzahl der als „relevant" markierten Dienste je Person (optional im Zeitraum
    von/bis). Muss vor '/{dienstbuch_id}' stehen, sonst wird der Pfad als ID gedeutet."""
    paare = await dienstbuch_service.relevante_dienste_pro_person(db, von, bis)
    return [RelevanteDiensteEintrag(person_id=pid, anzahl=anzahl) for pid, anzahl in paare]


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


@router.post("/{dienstbuch_id}/schliessen", response_model=DienstbuchOut)
async def schliessen(db: DbSession, _moderator: CurrentModerator, dienstbuch_id: int) -> DienstbuchOut:
    dienstbuch = await dienstbuch_service.get_dienstbuch(db, dienstbuch_id)
    if dienstbuch is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dienstbuch nicht gefunden.")
    return await dienstbuch_service.dienstbuch_schliessen(db, dienstbuch)


@router.post("/{dienstbuch_id}/wieder-oeffnen", response_model=DienstbuchOut)
async def wieder_oeffnen(db: DbSession, _moderator: CurrentModerator, dienstbuch_id: int) -> DienstbuchOut:
    dienstbuch = await dienstbuch_service.get_dienstbuch(db, dienstbuch_id)
    if dienstbuch is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dienstbuch nicht gefunden.")
    return await dienstbuch_service.dienstbuch_wieder_oeffnen(db, dienstbuch)


@router.patch("/{dienstbuch_id}/relevant", response_model=DienstbuchOut)
async def relevant_setzen(
    db: DbSession, _moderator: CurrentModerator, dienstbuch_id: int, daten: RelevantSetzen
) -> DienstbuchOut:
    dienstbuch = await dienstbuch_service.get_dienstbuch(db, dienstbuch_id)
    if dienstbuch is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dienstbuch nicht gefunden.")
    return await dienstbuch_service.relevant_setzen(db, dienstbuch, daten.relevant)


@router.post("/{dienstbuch_id}/reservierung", response_model=DienstbuchReservierungOut, dependencies=[])
async def reservierung_anlegen(db: DbSession, dienstbuch_id: int) -> DienstbuchReservierungOut:
    """Erstellt einen Reservierungs-Token für 'Barcode vergessen' im
    Dienstbuch. Bewusst ohne Auth, der Button steht im Kiosk ohne
    Moderator-Login."""
    dienstbuch = await dienstbuch_service.get_dienstbuch(db, dienstbuch_id)
    if dienstbuch is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dienstbuch nicht gefunden.")
    reservierung = await dienstbuch_reservierung_service.reservierung_anlegen(db, dienstbuch_id)
    return DienstbuchReservierungOut(token=reservierung.token, ablauf_am=reservierung.ablauf_am)


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
