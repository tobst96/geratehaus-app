import secrets

from fastapi import APIRouter, HTTPException, Response, status
from sqlalchemy import select

from app.api.deps import CurrentModerator, DbSession
from app.models.barcode_token import FahrzeugToken
from app.models.person import Person
from app.services import barcode_service, stammdaten_service

router = APIRouter(prefix="/moderator/barcodes", tags=["moderator:barcodes"])


@router.post("/person/{person_id}")
async def generate_barcode_for_person(
    db: DbSession, _moderator: CurrentModerator, person_id: int
) -> dict[str, str | None]:
    """Generate a new barcode token for a person, valid for the configured
    Gültigkeitsdauer (Einstellungen > Barcodes, Default 2 Jahre)."""
    result = await db.execute(select(Person).where(Person.id == person_id))
    person = result.scalar_one_or_none()
    if person is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Person not found.")

    token = await barcode_service.token_fuer_person(db, person_id)
    return {
        "token": token.token,
        "ablauf_am": token.ablauf_am.isoformat() if token.ablauf_am else None,
    }


@router.get("/render/{token}")
async def barcode_bild_rendern(token: str) -> Response:
    """Rendert den Token als echten Code128-Strichcode (PNG) zum Ausdrucken.

    Bewusst ohne Moderator-Auth: ein <img>-Tag kann keinen Bearer-Token senden.
    Unbedenklich, da das Bild nur den bereits bekannten Token visualisiert –
    wer den Token nicht hat, kann ihn auch nicht in die URL einsetzen."""
    return Response(content=barcode_service.render_png(token), media_type="image/png")


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
