from fastapi import APIRouter, HTTPException, status

from app.api.deps import CurrentModerator, DbSession
from app.schemas.buchung import BuchungAblehnen, BuchungOut
from app.services import audit_service, buchung_service

router = APIRouter(prefix="/moderator/buchungen", tags=["moderator:buchungen"])


@router.get("/{buchung_id}/konflikte", response_model=list[BuchungOut])
async def konfliktvergleich(
    db: DbSession, _moderator: CurrentModerator, buchung_id: int
) -> list[BuchungOut]:
    buchung = await buchung_service.get_buchung(db, buchung_id)
    if buchung is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Buchung nicht gefunden.")
    return await buchung_service.konfliktvergleich(db, buchung)


@router.post("/{buchung_id}/genehmigen", response_model=BuchungOut)
async def genehmigen(db: DbSession, moderator: CurrentModerator, buchung_id: int) -> BuchungOut:
    buchung = await buchung_service.get_buchung(db, buchung_id)
    if buchung is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Buchung nicht gefunden.")
    ergebnis = await buchung_service.genehmigen(db, buchung)
    await audit_service.protokolliere(
        db, moderator.username, "buchung_genehmigt", "buchung", buchung_id,
        f"{ergebnis.fahrzeug_name}",
    )
    return ergebnis


@router.post("/{buchung_id}/ablehnen", response_model=BuchungOut)
async def ablehnen(
    db: DbSession, moderator: CurrentModerator, buchung_id: int, daten: BuchungAblehnen
) -> BuchungOut:
    buchung = await buchung_service.get_buchung(db, buchung_id)
    if buchung is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Buchung nicht gefunden.")
    ergebnis = await buchung_service.ablehnen(db, buchung, daten.grund)
    await audit_service.protokolliere(
        db, moderator.username, "buchung_abgelehnt", "buchung", buchung_id,
        f"{ergebnis.fahrzeug_name}: {daten.grund or ''}".strip(),
    )
    return ergebnis
