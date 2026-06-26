from datetime import date, timedelta

from fastapi import APIRouter, HTTPException, status

from app.api.deps import CurrentModerator, DbSession
from app.schemas.person import PunkteBelohnung
from app.services import stammdaten_service

router = APIRouter(prefix="/moderator/punkte", tags=["moderator:punkte"])


@router.post("/belohnung", status_code=status.HTTP_201_CREATED)
async def belohnung_vergeben(db: DbSession, _moderator: CurrentModerator, daten: PunkteBelohnung) -> dict[str, int]:
    """Manuelle Punkte-Vergabe als Belohnung, unabhängig von den
    automatischen Regeln (Einsatz, Dienstbuch, Dienststunden, ...). Bewusst
    für jeden Moderator (nicht nur Admin) – die übrigen Punkte-Einstellungen
    (Regel-Werte) bleiben admin-only, siehe Frontend."""
    person = await stammdaten_service.get_person(db, daten.person_id)
    if person is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Person nicht gefunden.")

    gueltig_bis = date.today() + timedelta(days=daten.gueltig_tage)
    await stammdaten_service.punkte_vergeben(
        db, daten.person_id, daten.punkte, f"Belohnung: {daten.grund}", gueltig_bis
    )
    await stammdaten_service.person_ereignis_protokollieren(
        db,
        daten.person_id,
        "punkte_vergeben",
        f"{daten.punkte} Punkte als Belohnung vergeben: „{daten.grund}“ (gültig bis {gueltig_bis})",
    )
    await db.commit()
    gesamtpunkte = await stammdaten_service.gesamtpunkte(db, daten.person_id)
    return {"gesamtpunkte": gesamtpunkte}
