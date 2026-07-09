"""Selbstverwaltung des eigenen Moderator-Kontos (jeder angemeldete Moderator,
auch Gruppenführer ohne Einstellungen-Zugriff) – aktuell die Zwei-Faktor-
Authentisierung per E-Mail-OTP."""

from fastapi import APIRouter, HTTPException, status

from app.api.deps import CurrentModerator, DbSession
from app.schemas.moderator import RecoveryCodesOut, ZweiFaktorStatus
from app.services import audit_service, zwei_faktor_service

router = APIRouter(prefix="/moderator/konto", tags=["moderator:konto"])


@router.get("/2fa", response_model=ZweiFaktorStatus)
async def zwei_faktor_status(ich: CurrentModerator) -> ZweiFaktorStatus:
    return ZweiFaktorStatus(aktiv=ich.zwei_faktor_aktiv, email_gesetzt=bool(ich.email))


@router.post("/2fa/aktivieren", response_model=RecoveryCodesOut)
async def zwei_faktor_aktivieren(db: DbSession, ich: CurrentModerator) -> RecoveryCodesOut:
    """Schaltet 2FA für den eigenen Zugang ein (E-Mail erforderlich) und liefert die
    Recovery-Codes **einmalig** zurück – danach sind sie nicht mehr abrufbar."""
    try:
        codes = await zwei_faktor_service.aktivieren(db, ich)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    await audit_service.protokolliere(db, ich.name, "moderator_2fa_aktiviert", "moderator", ich.id)
    return RecoveryCodesOut(codes=codes)


@router.post("/2fa/recovery-codes-neu", response_model=RecoveryCodesOut)
async def recovery_codes_neu(db: DbSession, ich: CurrentModerator) -> RecoveryCodesOut:
    if not ich.zwei_faktor_aktiv:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="2FA ist nicht aktiv.")
    codes = await zwei_faktor_service.recovery_codes_erzeugen(db, ich)
    await audit_service.protokolliere(
        db, ich.name, "moderator_2fa_recovery_neu", "moderator", ich.id
    )
    return RecoveryCodesOut(codes=codes)


@router.post("/2fa/deaktivieren", status_code=status.HTTP_204_NO_CONTENT)
async def zwei_faktor_deaktivieren(db: DbSession, ich: CurrentModerator) -> None:
    await zwei_faktor_service.deaktivieren(db, ich)
    await audit_service.protokolliere(db, ich.name, "moderator_2fa_deaktiviert", "moderator", ich.id)
