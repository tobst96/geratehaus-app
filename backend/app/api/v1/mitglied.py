"""Persönliches Mitglieder-Dashboard: aggregierte eigene Daten (nur für die
über das Namens-Cookie identifizierte Person selbst)."""

from fastapi import APIRouter

from app.api.deps import CurrentPerson, DbSession
from app.schemas.mitglied import MitgliedUebersicht
from app.services import mitglied_service

router = APIRouter(prefix="/mitglied", tags=["mitglied"])


@router.get("/uebersicht", response_model=MitgliedUebersicht)
async def uebersicht(db: DbSession, person: CurrentPerson) -> MitgliedUebersicht:
    return await mitglied_service.uebersicht(db, person.id)
