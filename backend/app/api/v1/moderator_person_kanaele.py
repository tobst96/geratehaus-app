from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select

from app.api.deps import DbSession, require_modul_zugriff
from app.models.person import Person
from app.schemas.benachrichtigungskanal import (
    AboSetzen,
    EreignisTypOut,
    KanalOut,
    KanalSetzen,
    KanalTypOut,
)
from app.services import benachrichtigungskanal_service as kanal_service

# Phase 4b: granular geschützt – Admins immer (Bypass), sonst Freigabe des Moduls
# „personal" nötig (Kanäle werden in der Personal-Detailseite gepflegt).
router = APIRouter(
    prefix="/moderator",
    tags=["moderator:benachrichtigungskanaele"],
    dependencies=[Depends(require_modul_zugriff("personal"))],
)


@router.get("/kanal-typen", response_model=list[KanalTypOut])
async def kanal_typen() -> list[KanalTypOut]:
    """Verfügbare Kanaltypen (Registry) für die Kanal-UI."""
    return [
        KanalTypOut(key=k.key, label=k.label, zielwert_label=k.zielwert_label)
        for k in kanal_service.KANAL_TYPEN
    ]


async def _person_oder_404(db: DbSession, person_id: int) -> Person:
    person = (
        await db.execute(select(Person).where(Person.id == person_id))
    ).scalar_one_or_none()
    if person is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Person nicht gefunden.")
    return person


@router.get("/personen/{person_id}/kanaele", response_model=list[KanalOut])
async def kanaele_lesen(db: DbSession, person_id: int) -> list[KanalOut]:
    await _person_oder_404(db, person_id)
    return await kanal_service.liste_fuer_person(db, person_id)


@router.put("/personen/{person_id}/kanaele/{typ}", response_model=KanalOut)
async def kanal_setzen(db: DbSession, person_id: int, typ: str, daten: KanalSetzen) -> KanalOut:
    await _person_oder_404(db, person_id)
    kanal = await kanal_service.setzen(db, person_id, typ, daten.zielwert, daten.aktiv)
    if kanal is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unbekannter Kanaltyp.")
    return kanal


@router.delete("/personen/{person_id}/kanaele/{typ}", status_code=status.HTTP_204_NO_CONTENT)
async def kanal_loeschen(db: DbSession, person_id: int, typ: str) -> None:
    await _person_oder_404(db, person_id)
    if not await kanal_service.loeschen(db, person_id, typ):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kanal nicht gefunden.")


# --- Ereignis-Abos pro Person -------------------------------------------------


@router.get("/ereignis-typen", response_model=list[EreignisTypOut])
async def ereignis_typen() -> list[EreignisTypOut]:
    """Abonnierbare Ereignistypen (Registry) für die Abo-UI."""
    return [EreignisTypOut(key=e.key, label=e.label) for e in kanal_service.EREIGNIS_TYPEN]


@router.get("/personen/{person_id}/abos", response_model=list[str])
async def abos_lesen(db: DbSession, person_id: int) -> list[str]:
    await _person_oder_404(db, person_id)
    return await kanal_service.abos_fuer_person(db, person_id)


@router.put("/personen/{person_id}/abos/{ereignis}", status_code=status.HTTP_204_NO_CONTENT)
async def abo_setzen(db: DbSession, person_id: int, ereignis: str, daten: AboSetzen) -> None:
    await _person_oder_404(db, person_id)
    if not await kanal_service.set_abo(db, person_id, ereignis, daten.aktiv):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unbekanntes Ereignis.")
