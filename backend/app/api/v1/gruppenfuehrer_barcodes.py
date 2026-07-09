import secrets
import structlog

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select

from app.api.deps import DbSession, require_modul_zugriff
from app.models.barcode_token import FahrzeugToken
from app.models.kiosk_token import KioskToken
from app.models.person import Person
from app.schemas.kiosk_token import KioskTokenAnlegen, KioskTokenOut, KioskTokenStartseiteModule
from app.services import barcode_service, kiosk_token_service, pdf_service, stammdaten_service

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/gruppenfuehrer/barcodes", tags=["moderator:barcodes"])


@router.post(
    "/alle-erneuern-und-senden", dependencies=[Depends(require_modul_zugriff("barcodes"))]
)
async def alle_barcodes_erneuern_und_senden(db: DbSession) -> dict[str, int]:
    """Erneuert alle Barcodes und sendet sie per Mail an alle Personen mit
    aktivierten Benachrichtigungen und hinterlegter E-Mail-Adresse."""
    result = await db.execute(
        select(Person)
        .where(Person.email.isnot(None))
        .where(Person.benachrichtigungen_aktiv.is_(True))
    )
    personen = list(result.scalars().all())
    gesendet = 0
    fehler = 0
    for person in personen:
        try:
            await barcode_service.erneuerung_mail_senden(db, person)
            gesendet += 1
        except Exception:
            logger.warning("barcode_massenversand_fehler", person_id=person.id, exc_info=True)
            fehler += 1
    return {"gesendet": gesendet, "fehler": fehler}


@router.post("/person/{person_id}", dependencies=[Depends(require_modul_zugriff("barcodes"))])
async def generate_barcode_for_person(
    db: DbSession, person_id: int
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


@router.post("/fahrzeug/{fahrzeug_id}", dependencies=[Depends(require_modul_zugriff("barcodes"))])
async def generate_token_for_fahrzeug(
    db: DbSession, fahrzeug_id: int
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


# --- Kiosk-Tokens (ein Token pro Tablet/Gerät im Gerätehaus) ------------------


@router.get(
    "/kiosk",
    response_model=list[KioskTokenOut],
    dependencies=[Depends(require_modul_zugriff("kiosk-geraete"))],
)
async def kiosk_tokens_liste(db: DbSession) -> list[KioskTokenOut]:
    return await kiosk_token_service.liste(db)


@router.post(
    "/kiosk",
    response_model=KioskTokenOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_modul_zugriff("kiosk-geraete"))],
)
async def kiosk_token_anlegen(db: DbSession, daten: KioskTokenAnlegen) -> KioskTokenOut:
    return await kiosk_token_service.anlegen(db, daten.bezeichnung)


@router.patch(
    "/kiosk/{kiosk_token_id}",
    response_model=KioskTokenOut,
    dependencies=[Depends(require_modul_zugriff("kiosk-geraete"))],
)
async def kiosk_token_startseite_setzen(
    db: DbSession, kiosk_token_id: int, daten: KioskTokenStartseiteModule
) -> KioskToken:
    """Legt fest, welche Module auf der Startseite dieses Kiosk-Links erscheinen
    (None = globale Einstellung)."""
    kiosk_token = await kiosk_token_service.get(db, kiosk_token_id)
    if kiosk_token is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kiosk-Token nicht gefunden.")
    return await kiosk_token_service.set_startseite_module(db, kiosk_token, daten.startseite_module)


@router.get(
    "/kiosk/{kiosk_token_id}/pdf", dependencies=[Depends(require_modul_zugriff("kiosk-geraete"))]
)
async def kiosk_token_pdf(db: DbSession, kiosk_token_id: int) -> Response:
    """Ausdruckbares QR-PDF-Poster für ein Kiosk-Gerät (Logo, Gerätename, QR auf
    den Kiosk-Link, Einrichtungs-Anleitung)."""
    kiosk_token = await kiosk_token_service.get(db, kiosk_token_id)
    if kiosk_token is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kiosk-Gerät nicht gefunden.")
    pdf_bytes = await pdf_service.kiosk_link_pdf(db, kiosk_token)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="kiosk-{kiosk_token_id}.pdf"'},
    )


@router.delete(
    "/kiosk/{kiosk_token_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_modul_zugriff("kiosk-geraete"))],
)
async def kiosk_token_loeschen(db: DbSession, kiosk_token_id: int) -> None:
    kiosk_token = await kiosk_token_service.get(db, kiosk_token_id)
    if kiosk_token is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kiosk-Token nicht gefunden.")
    await kiosk_token_service.loeschen(db, kiosk_token)
