from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import CurrentGruppenfuehrer, DbSession, require_modul_aktiv
from app.schemas.dienstbuch_planer import (
    PlanerKategorieAktualisieren,
    PlanerKategorieAnlegen,
    PlanerKategorieOut,
    PlanPlatzhalterAnlegen,
    PlanTerminAktualisieren,
    PlanTerminAnlegen,
    PlanTerminEreignisOut,
    PlanTerminOut,
    PlanVorlageAktualisieren,
    PlanVorlageAnlegen,
    PlanVorlageOut,
    VorlageUeberfaelligOut,
)
from app.services import dienstbuch_planer_service as service
from app.services.dienstbuch_plan_engine import VorlageValidierungsFehler

router = APIRouter(
    prefix="/dienstbuch-planer",
    tags=["dienstbuch-planer"],
    dependencies=[Depends(require_modul_aktiv("modul_dienstbuch_planer_aktiv"))],
)

# Nutzerentscheid (25.08.2026): der Planer steht ALLEN Gruppenführern offen
# (ansehen UND bearbeiten), keine granularen Einzelrechte - analog zu den
# bewusst für alle Gruppenführer offenen Stammdaten-Endpunkten (Personen-Liste,
# Ampel). Die früheren Keys "dienstbuch-planer-ansehen"/"-bearbeiten" wurden
# aus der MODUL_REGISTRY entfernt.
PlanerZugriff = CurrentGruppenfuehrer


def _termin_zu_out(termin) -> PlanTerminOut:
    return PlanTerminOut(
        id=termin.id,
        vorlage_id=termin.vorlage_id,
        vorlage_titel=termin.vorlage.titel if termin.vorlage else None,
        jahr=termin.jahr,
        titel=termin.titel,
        beschreibung=termin.beschreibung,
        zieldatum=termin.zieldatum,
        uhrzeit=termin.uhrzeit,
        ist_platzhalter=termin.ist_platzhalter,
        status=termin.status,
        dienstbuch_id=termin.dienstbuch_id,
        dienstbuch_erzeugt_am=termin.dienstbuch_erzeugt_am,
        kategorien=list(termin.kategorien),
    )


async def _termin_oder_404(db: DbSession, termin_id: int):
    termin = await service.get_termin(db, termin_id)
    if termin is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Termin nicht gefunden.")
    return termin


async def _vorlage_oder_404(db: DbSession, vorlage_id: int):
    vorlage = await service.get_vorlage(db, vorlage_id)
    if vorlage is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vorlage nicht gefunden.")
    return vorlage


async def _kategorie_oder_404(db: DbSession, kategorie_id: int):
    kategorie = await service.get_kategorie(db, kategorie_id)
    if kategorie is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kategorie nicht gefunden.")
    return kategorie


# --- Kategorien ---------------------------------------------------------------


@router.get("/kategorien", response_model=list[PlanerKategorieOut])
async def kategorien_lesen(db: DbSession, _person: PlanerZugriff) -> list[PlanerKategorieOut]:
    return await service.liste_kategorien(db, nur_aktive=False)


@router.post("/kategorien", response_model=PlanerKategorieOut, status_code=status.HTTP_201_CREATED)
async def kategorie_anlegen(
    db: DbSession, _person: PlanerZugriff, daten: PlanerKategorieAnlegen
) -> PlanerKategorieOut:
    return await service.kategorie_anlegen(db, daten)


@router.patch("/kategorien/{kategorie_id}", response_model=PlanerKategorieOut)
async def kategorie_aktualisieren(
    db: DbSession, _person: PlanerZugriff, kategorie_id: int, daten: PlanerKategorieAktualisieren
) -> PlanerKategorieOut:
    kategorie = await _kategorie_oder_404(db, kategorie_id)
    return await service.kategorie_aktualisieren(db, kategorie, daten)


# --- Vorlagen -------------------------------------------------------------


@router.get("/vorlagen", response_model=list[PlanVorlageOut])
async def vorlagen_lesen(db: DbSession, _person: PlanerZugriff) -> list[PlanVorlageOut]:
    return await service.liste_vorlagen(db, nur_aktive=False)


@router.post("/vorlagen", response_model=PlanVorlageOut, status_code=status.HTTP_201_CREATED)
async def vorlage_anlegen(
    db: DbSession, _person: PlanerZugriff, daten: PlanVorlageAnlegen
) -> PlanVorlageOut:
    try:
        return await service.vorlage_anlegen(db, daten)
    except VorlageValidierungsFehler as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.patch("/vorlagen/{vorlage_id}", response_model=PlanVorlageOut)
async def vorlage_aktualisieren(
    db: DbSession, _person: PlanerZugriff, vorlage_id: int, daten: PlanVorlageAktualisieren
) -> PlanVorlageOut:
    vorlage = await _vorlage_oder_404(db, vorlage_id)
    try:
        return await service.vorlage_aktualisieren(db, vorlage, daten)
    except VorlageValidierungsFehler as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.delete("/vorlagen/{vorlage_id}", response_model=PlanVorlageOut)
async def vorlage_deaktivieren(
    db: DbSession, _person: PlanerZugriff, vorlage_id: int
) -> PlanVorlageOut:
    """Kein Hard-Delete - bestehende Instanzen bleiben erhalten, es werden nur
    keine neuen mehr generiert."""
    vorlage = await _vorlage_oder_404(db, vorlage_id)
    return await service.vorlage_deaktivieren(db, vorlage)


# --- Termine ----------------------------------------------------------------


@router.get("/termine", response_model=list[PlanTerminOut])
async def termine_lesen(db: DbSession, _person: PlanerZugriff, jahr: int) -> list[PlanTerminOut]:
    termine = await service.liste_termine(db, jahr)
    return [_termin_zu_out(t) for t in termine]


@router.post("/termine/jahr/{jahr}/sicherstellen", response_model=list[PlanTerminOut])
async def jahr_sicherstellen(db: DbSession, person: PlanerZugriff, jahr: int) -> list[PlanTerminOut]:
    neue = await service.instanzen_fuer_jahr_sicherstellen(db, jahr, person.name)
    return [_termin_zu_out(t) for t in neue]


@router.post("/platzhalter", response_model=PlanTerminOut, status_code=status.HTTP_201_CREATED)
async def platzhalter_anlegen(
    db: DbSession, person: PlanerZugriff, daten: PlanPlatzhalterAnlegen
) -> PlanTerminOut:
    termin = await service.platzhalter_anlegen(db, daten, person.name)
    return _termin_zu_out(termin)


@router.post("/termine", response_model=PlanTerminOut, status_code=status.HTTP_201_CREATED)
async def termin_anlegen(
    db: DbSession, person: PlanerZugriff, daten: PlanTerminAnlegen
) -> PlanTerminOut:
    """Manuell angelegter Einzeltermin mit festem Datum (+ optionaler Uhrzeit),
    ohne Vorlage."""
    termin = await service.termin_anlegen(db, daten, person.name)
    return _termin_zu_out(termin)


@router.patch("/termine/{termin_id}", response_model=PlanTerminOut)
async def termin_aktualisieren(
    db: DbSession, person: PlanerZugriff, termin_id: int, daten: PlanTerminAktualisieren
) -> PlanTerminOut:
    termin = await _termin_oder_404(db, termin_id)
    termin = await service.termin_aktualisieren(db, termin, daten, person.name)
    return _termin_zu_out(termin)


@router.post("/termine/{termin_id}/bestaetigen", response_model=PlanTerminOut)
async def termin_bestaetigen(db: DbSession, person: PlanerZugriff, termin_id: int) -> PlanTerminOut:
    termin = await _termin_oder_404(db, termin_id)
    termin = await service.termin_bestaetigen(db, termin, person.name)
    return _termin_zu_out(termin)


@router.post("/termine/{termin_id}/entwurf", response_model=PlanTerminOut)
async def termin_zu_entwurf(db: DbSession, person: PlanerZugriff, termin_id: int) -> PlanTerminOut:
    termin = await _termin_oder_404(db, termin_id)
    try:
        termin = await service.termin_zu_entwurf_zuruecksetzen(db, termin, person.name)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    return _termin_zu_out(termin)


@router.get("/termine/{termin_id}/ereignisse", response_model=list[PlanTerminEreignisOut])
async def termin_ereignisse(
    db: DbSession, _person: PlanerZugriff, termin_id: int
) -> list[PlanTerminEreignisOut]:
    await _termin_oder_404(db, termin_id)
    return await service.termin_ereignisse(db, termin_id)


@router.get("/ueberfaellig", response_model=list[VorlageUeberfaelligOut])
async def ueberfaellige_vorlagen(db: DbSession, _person: PlanerZugriff) -> list[VorlageUeberfaelligOut]:
    heute = datetime.now(timezone.utc).date()
    treffer = await service.ueberfaellige_vorlagen(db, heute)
    return [
        VorlageUeberfaelligOut(
            vorlage_id=vorlage.id, titel=vorlage.titel, letztes_zieldatum=letztes, tage_ueberfaellig=tage
        )
        for vorlage, letztes, tage in treffer
    ]
