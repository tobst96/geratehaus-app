"""Endpoints für den Außenzugriff ohne Standort-Check.

Nur die zwei laut Projektvorgabe freigegebenen Bereiche sind hier erreichbar:
Fahrzeugbuchungs-Kalender (lesen + neue Anfrage) und eigene Dienststunden.
Authentifizierung erfolgt über das signierte PIN-Session-Cookie, siehe
app.api.deps.get_current_person_via_pin_session.
"""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import CurrentPersonViaPin, DbSession, require_modul_aktiv
from app.schemas.buchung import BuchungAnfrage, BuchungAnfrageErgebnis, BuchungOut
from app.schemas.dienststunden import DienststundenSummeOut
from app.services import buchung_service, dienststunden_service

router = APIRouter(prefix="/aussen", tags=["aussenzugriff"])


@router.get(
    "/buchungen",
    response_model=list[BuchungOut],
    dependencies=[Depends(require_modul_aktiv("modul_fahrzeugbuchung_aktiv"))],
)
async def buchungen_liste(
    db: DbSession, _person: CurrentPersonViaPin, von: datetime | None = None, bis: datetime | None = None
) -> list[BuchungOut]:
    return await buchung_service.liste_buchungen(db, von, bis)


@router.post(
    "/buchungen",
    response_model=BuchungAnfrageErgebnis,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_modul_aktiv("modul_fahrzeugbuchung_aktiv"))],
)
async def buchungen_anfrage_erstellen(
    db: DbSession, person: CurrentPersonViaPin, daten: BuchungAnfrage
) -> BuchungAnfrageErgebnis:
    if not await buchung_service.ist_buchbar(db, daten.fahrzeug_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Dieses Fahrzeug ist aktuell nicht buchbar.",
        )
    buchung, konflikt = await buchung_service.anfrage_erstellen(db, person.id, daten)
    return BuchungAnfrageErgebnis(buchung=buchung, konflikt_hinweis=konflikt)


@router.get(
    "/dienststunden",
    response_model=list[DienststundenSummeOut],
    dependencies=[Depends(require_modul_aktiv("modul_dienststunden_aktiv"))],
)
async def eigene_dienststunden(db: DbSession, person: CurrentPersonViaPin) -> list[DienststundenSummeOut]:
    """Gefiltert auf die eigene, über den PIN authentifizierte Person."""
    return await dienststunden_service.eigene_summen(db, person.id)
