from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import CurrentPerson, DbSession, require_modul_aktiv
from app.schemas.buchung import BuchungAnfrage, BuchungAnfrageErgebnis, BuchungOut
from app.schemas.fahrzeugbuchung_reservierung import FahrzeugbuchungReservierungOut
from app.services import buchung_service, fahrzeugbuchung_reservierung_service

router = APIRouter(
    prefix="/buchungen",
    tags=["fahrzeugbuchung"],
    dependencies=[
        Depends(require_modul_aktiv("modul_fahrzeugbuchung_aktiv")),
    ],
)


@router.get("", response_model=list[BuchungOut])
async def liste(db: DbSession, von: datetime | None = None, bis: datetime | None = None) -> list[BuchungOut]:
    return await buchung_service.liste_buchungen(db, von, bis)


@router.post("", response_model=BuchungAnfrageErgebnis, status_code=status.HTTP_201_CREATED)
async def anfrage_erstellen(
    db: DbSession, person: CurrentPerson, daten: BuchungAnfrage
) -> BuchungAnfrageErgebnis:
    if not await buchung_service.ist_buchbar(db, daten.fahrzeug_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Dieses Fahrzeug ist aktuell nicht buchbar.",
        )
    buchung, konflikt = await buchung_service.anfrage_erstellen(db, person.id, daten)
    return BuchungAnfrageErgebnis(buchung=buchung, konflikt_hinweis=konflikt)


@router.post("/reservierung", response_model=FahrzeugbuchungReservierungOut, dependencies=[])
async def reservierung_anlegen(db: DbSession) -> FahrzeugbuchungReservierungOut:
    """Erstellt einen Reservierungs-Token für 'Barcode vergessen': QR-Code
    führt auf eine Seite, auf der sich die Person ohne Barcode komplett
    selbst eintragen kann (Person, Fahrzeug, Zeitraum, Zweck)."""
    reservierung = await fahrzeugbuchung_reservierung_service.reservierung_anlegen(db)
    return FahrzeugbuchungReservierungOut(token=reservierung.token, ablauf_am=reservierung.ablauf_am)


@router.post("/{buchung_id}/zurueckziehen", response_model=BuchungOut)
async def zurueckziehen(db: DbSession, person: CurrentPerson, buchung_id: int) -> BuchungOut:
    buchung = await buchung_service.get_buchung(db, buchung_id)
    if buchung is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Buchung nicht gefunden.")
    if buchung.verantwortliche_person_id != person.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nur eigene Anfragen können zurückgezogen werden.",
        )
    if buchung.status != "ausstehend":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nur ausstehende Anfragen können zurückgezogen werden.",
        )
    return await buchung_service.zurueckziehen(db, buchung)
