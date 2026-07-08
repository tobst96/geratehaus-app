from fastapi import APIRouter, HTTPException, Response, status

from app.api.deps import CurrentAdmin, CurrentModerator, DbSession
from app.schemas.formular import (
    EinreichungOut,
    FormularCreate,
    FormularFeldCreate,
    FormularFeldOut,
    FormularOut,
    FormularUpdate,
    ZusammenfassungOut,
)
from app.services import formular_service

router = APIRouter(prefix="/moderator/formulare", tags=["moderator:formular"])


# --- Formulare (Admin-Verwaltung) --------------------------------------------


@router.get("", response_model=list[FormularOut])
async def formulare_liste(db: DbSession, _admin: CurrentAdmin) -> list[FormularOut]:
    return await formular_service.liste_formulare(db)


@router.post("", response_model=FormularOut, status_code=status.HTTP_201_CREATED)
async def formular_anlegen(db: DbSession, _admin: CurrentAdmin, daten: FormularCreate) -> FormularOut:
    return await formular_service.formular_anlegen(db, daten)


@router.get("/sichtbar", response_model=list[FormularOut])
async def formulare_sichtbar(db: DbSession, moderator: CurrentModerator) -> list[FormularOut]:
    """Formulare, deren Einreichungen der angemeldete Moderator sehen darf: Admins
    alle, sonst nur Formulare mit `moderator_sichtbar`. Für die Listen-Ansicht."""
    formulare = await formular_service.liste_formulare(db)
    if moderator.rolle == "admin":
        return formulare
    return [f for f in formulare if f.moderator_sichtbar]


@router.get("/{formular_id}", response_model=FormularOut)
async def formular_detail(db: DbSession, _admin: CurrentAdmin, formular_id: int) -> FormularOut:
    formular = await formular_service.get_formular(db, formular_id)
    if formular is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Formular nicht gefunden.")
    return formular


@router.put("/{formular_id}", response_model=FormularOut)
async def formular_aktualisieren(
    db: DbSession, _admin: CurrentAdmin, formular_id: int, daten: FormularUpdate
) -> FormularOut:
    formular = await formular_service.get_formular(db, formular_id)
    if formular is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Formular nicht gefunden.")
    return await formular_service.formular_aktualisieren(db, formular, daten)


@router.delete("/{formular_id}", status_code=status.HTTP_204_NO_CONTENT)
async def formular_loeschen(db: DbSession, _admin: CurrentAdmin, formular_id: int) -> None:
    formular = await formular_service.get_formular(db, formular_id)
    if formular is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Formular nicht gefunden.")
    await formular_service.formular_loeschen(db, formular)


@router.post("/{formular_id}/duplizieren", response_model=FormularOut, status_code=status.HTTP_201_CREATED)
async def formular_duplizieren(db: DbSession, _admin: CurrentAdmin, formular_id: int) -> FormularOut:
    formular = await formular_service.get_formular(db, formular_id)
    if formular is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Formular nicht gefunden.")
    return await formular_service.formular_duplizieren(db, formular)


# --- Felder ------------------------------------------------------------------


@router.post("/{formular_id}/felder", response_model=FormularFeldOut, status_code=status.HTTP_201_CREATED)
async def feld_anlegen(
    db: DbSession, _admin: CurrentAdmin, formular_id: int, daten: FormularFeldCreate
) -> FormularFeldOut:
    formular = await formular_service.get_formular(db, formular_id)
    if formular is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Formular nicht gefunden.")
    return await formular_service.feld_anlegen(db, formular_id, daten)


@router.put("/felder/{feld_id}", response_model=FormularFeldOut)
async def feld_aktualisieren(
    db: DbSession, _admin: CurrentAdmin, feld_id: int, daten: FormularFeldCreate
) -> FormularFeldOut:
    feld = await formular_service.get_feld(db, feld_id)
    if feld is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feld nicht gefunden.")
    return await formular_service.feld_aktualisieren(db, feld, daten)


@router.delete("/felder/{feld_id}", status_code=status.HTTP_204_NO_CONTENT)
async def feld_loeschen(db: DbSession, _admin: CurrentAdmin, feld_id: int) -> None:
    feld = await formular_service.get_feld(db, feld_id)
    if feld is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feld nicht gefunden.")
    await formular_service.feld_loeschen(db, feld)


# --- Einreichungen -----------------------------------------------------------


@router.get("/{formular_id}/einreichungen", response_model=list[EinreichungOut])
async def einreichungen_liste(
    db: DbSession, moderator: CurrentModerator, formular_id: int
) -> list[EinreichungOut]:
    formular = await formular_service.get_formular(db, formular_id)
    if formular is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Formular nicht gefunden.")
    if moderator.rolle != "admin" and not formular.moderator_sichtbar:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Für dieses Formular sind die Einreichungen nicht freigegeben.",
        )
    return await formular_service.einreichungen_out(db, formular_id)


@router.get("/{formular_id}/zusammenfassung", response_model=ZusammenfassungOut)
async def zusammenfassung(
    db: DbSession, moderator: CurrentModerator, formular_id: int
) -> ZusammenfassungOut:
    """Aggregierter Zwischenstand (Ø/Verteilung/Freitexte) je Formular."""
    formular = await formular_service.get_formular(db, formular_id)
    if formular is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Formular nicht gefunden.")
    if moderator.rolle != "admin" and not formular.moderator_sichtbar:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Für dieses Formular ist die Auswertung nicht freigegeben.",
        )
    return await formular_service.zusammenfassung(db, formular)


@router.get("/{formular_id}/export.csv")
async def einreichungen_export(
    db: DbSession, moderator: CurrentModerator, formular_id: int
) -> Response:
    formular = await formular_service.get_formular(db, formular_id)
    if formular is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Formular nicht gefunden.")
    if moderator.rolle != "admin" and not formular.moderator_sichtbar:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Für dieses Formular ist der Export nicht freigegeben.",
        )
    einreichungen = await formular_service.einreichungen_fuer(db, formular_id)
    csv_text = formular_service.csv_export(formular, einreichungen)
    return Response(
        content="﻿" + csv_text,  # BOM → deutsches Excel erkennt UTF-8/Umlaute
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="formular-{formular_id}.csv"'},
    )
