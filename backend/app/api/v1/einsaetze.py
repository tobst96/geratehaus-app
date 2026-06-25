from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.api.deps import CurrentModerator, CurrentPerson, DbSession, require_modul_aktiv
from app.schemas.einsatz import (
    EinsatzAnlegen,
    EinsatzEreignisOut,
    EinsatzFehlversuchAnlegen,
    EinsatzOut,
    EinsatzZusatzfelderAktualisieren,
    TeilnahmeAnlegen,
    TeilnahmeOut,
)
from app.schemas.einsatz_feld import EinsatzFeldDefinitionOut
from app.schemas.reservierung import ReservierungAnlegen, ReservierungOut
from app.services import einsatz_service, pdf_service, reservierung_service, stammdaten_service
from app.services.config_service import config_service

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


@router.post("/{einsatz_id}/fehlversuch", status_code=status.HTTP_204_NO_CONTENT, dependencies=[])
async def einsatz_fehlversuch_protokollieren(
    db: DbSession, einsatz_id: int, daten: EinsatzFehlversuchAnlegen
) -> None:
    """Protokolliert einen gescheiterten Eintragungsversuch (z. B. ungültiger
    oder abgelaufener Barcode) in der Timeline. Bewusst ohne Auth, da die
    Person sich per Definition gerade NICHT erfolgreich identifizieren konnte."""
    einsatz = await einsatz_service.get_einsatz(db, einsatz_id)
    if einsatz is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Einsatz nicht gefunden.")
    beschreibung = f"Fehlgeschlagener Versuch ({daten.ort}): {daten.grund}" if daten.ort else (
        f"Fehlgeschlagener Versuch: {daten.grund}"
    )
    await einsatz_service.ereignis_protokollieren(db, einsatz_id, "fehlversuch", beschreibung)


@router.post("/{einsatz_id}/reservierung", response_model=ReservierungOut, dependencies=[])
async def reservierung_anlegen(
    db: DbSession, einsatz_id: int, daten: ReservierungAnlegen
) -> ReservierungOut:
    """Erstellt einen Reservierungs-Token für 'Barcode vergessen': QR-Code
    führt auf eine Seite, auf der sich die Person ohne Barcode für genau
    diesen Sitzplatz/diese Aktion in diesem Einsatz eintragen kann."""
    einsatz = await einsatz_service.get_einsatz(db, einsatz_id)
    if einsatz is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Einsatz nicht gefunden.")
    reservierung = await reservierung_service.reservierung_anlegen(db, einsatz_id, daten)
    return ReservierungOut(token=reservierung.token, ablauf_am=reservierung.ablauf_am)


@router.post("/{einsatz_id}/abschliessen", response_model=EinsatzOut)
async def einsatz_abschliessen(
    db: DbSession, _moderator: CurrentModerator, einsatz_id: int
) -> EinsatzOut:
    """Schließt einen Einsatz ab (Status 'offen' -> 'abgeschlossen')."""
    einsatz = await einsatz_service.get_einsatz(db, einsatz_id)
    if einsatz is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Einsatz nicht gefunden.")
    return await einsatz_service.einsatz_abschliessen(db, einsatz)


@router.post("/{einsatz_id}/wieder-oeffnen", response_model=EinsatzOut)
async def einsatz_wieder_oeffnen(
    db: DbSession, _moderator: CurrentModerator, einsatz_id: int
) -> EinsatzOut:
    """Öffnet einen abgeschlossenen Einsatz wieder (Status -> 'offen')."""
    einsatz = await einsatz_service.get_einsatz(db, einsatz_id)
    if einsatz is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Einsatz nicht gefunden.")
    return await einsatz_service.einsatz_wieder_oeffnen(db, einsatz)


@router.post("/{einsatz_id}/alle-eingetragen", response_model=EinsatzOut, dependencies=[])
async def einsatz_alle_eingetragen(db: DbSession, einsatz_id: int) -> EinsatzOut:
    """Plant den Abschluss des Einsatzes für in einigen Minuten ein (statt
    sofort zu schließen), damit Nachzügler sich noch eintragen können. Bewusst
    ohne Auth, da der Button im Gerätehaus-Kiosk ohne Moderator-Login steht."""
    einsatz = await einsatz_service.get_einsatz(db, einsatz_id)
    if einsatz is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Einsatz nicht gefunden.")
    minuten = await config_service.get(db, "einsatz_alle_eingetragen_minuten", 30)
    return await einsatz_service.einsatz_abschluss_planen(db, einsatz, int(minuten))
