from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
import secrets

from app.api.deps import CurrentModerator, DbSession
from app.models.barcode_token import BarcodeToken, FahrzeugToken
from app.models.person import Person
from app.services import stammdaten_service

router = APIRouter(prefix="/moderator/barcodes", tags=["moderator:barcodes"])


@router.post("/person/{person_id}")
async def generate_barcode_for_person(
    db: DbSession, _moderator: CurrentModerator, person_id: int
) -> dict[str, str]:
    """Generate a new barcode token for a person."""
    result = await db.execute(select(Person).where(Person.id == person_id))
    person = result.scalar_one_or_none()
    if person is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Person not found.")

    # Check if already has a token
    result = await db.execute(
        select(BarcodeToken).where(BarcodeToken.person_id == person_id)
    )
    existing = result.scalar_one_or_none()
    if existing:
        return {"token": existing.token}

    # Generate new token
    token = secrets.token_hex(8)  # 16 chars
    barcode = BarcodeToken(person_id=person_id, token=token)
    db.add(barcode)
    await db.commit()
    return {"token": token}


@router.post("/fahrzeug/{fahrzeug_id}")
async def generate_token_for_fahrzeug(
    db: DbSession, _moderator: CurrentModerator, fahrzeug_id: int
) -> dict[str, str]:
    """Generate a new access token for a vehicle (iPad display)."""
    fahrzeug = await stammdaten_service.get_fahrzeug(db, fahrzeug_id)
    if fahrzeug is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fahrzeug not found.")

    # Check if already has a token
    result = await db.execute(
        select(FahrzeugToken).where(FahrzeugToken.fahrzeug_id == fahrzeug_id)
    )
    existing = result.scalar_one_or_none()
    if existing:
        return {"token": existing.token}

    # Generate new token
    token = secrets.token_hex(12)  # 24 chars
    fahrzeug_token = FahrzeugToken(fahrzeug_id=fahrzeug_id, token=token)
    db.add(fahrzeug_token)
    await db.commit()
    return {"token": token}
