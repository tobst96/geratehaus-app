from fastapi import APIRouter, File, HTTPException, UploadFile, status

from app.api.deps import CurrentAdmin, CurrentModerator, DbSession
from app.schemas.dienststunden import DienststundenEintragOut, DienststundenErfassen, DienststundenSummeOut
from app.schemas.einsatz_feld import (
    EinsatzFeldDefinitionCreate,
    EinsatzFeldDefinitionOut,
    EinsatzFeldDefinitionUpdate,
)
from app.schemas.person import PersonCreate, PersonEreignisOut, PersonOut, PersonPinSetzen, PersonUpdate
from app.schemas.person_bild_reservierung import PersonBildReservierungOut
from app.schemas.stammdaten import (
    FahrzeugCreate,
    FahrzeugOut,
    FahrzeugUpdate,
    FunktionDienststundenCreate,
    FunktionDienststundenOut,
    FunktionDienststundenUpdate,
    FunktionEinsatzCreate,
    FunktionEinsatzOut,
    FunktionEinsatzUpdate,
    GruppeCreate,
    GruppeOut,
    GruppeUpdate,
)
from app.services import barcode_service, dienststunden_service, person_bild_reservierung_service, stammdaten_service
from app.services.config_service import config_service
from app.services.notifier.email import EmailNotifier

router = APIRouter(prefix="/moderator/stammdaten", tags=["moderator:stammdaten"])


# --- Fahrzeuge ---------------------------------------------------------------


@router.get("/fahrzeuge", response_model=list[FahrzeugOut])
async def fahrzeuge_liste(db: DbSession, _admin: CurrentAdmin) -> list[FahrzeugOut]:
    return await stammdaten_service.liste_fahrzeuge(db, nur_aktive=False)


@router.post("/fahrzeuge", response_model=FahrzeugOut, status_code=status.HTTP_201_CREATED)
async def fahrzeug_anlegen(
    db: DbSession, _admin: CurrentAdmin, daten: FahrzeugCreate
) -> FahrzeugOut:
    return await stammdaten_service.fahrzeug_anlegen(db, daten)


@router.put("/fahrzeuge/{fahrzeug_id}", response_model=FahrzeugOut)
async def fahrzeug_aktualisieren(
    db: DbSession, _admin: CurrentAdmin, fahrzeug_id: int, daten: FahrzeugUpdate
) -> FahrzeugOut:
    fahrzeug = await stammdaten_service.get_fahrzeug(db, fahrzeug_id)
    if fahrzeug is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fahrzeug nicht gefunden.")
    return await stammdaten_service.fahrzeug_aktualisieren(db, fahrzeug, daten)


@router.delete("/fahrzeuge/{fahrzeug_id}", status_code=status.HTTP_204_NO_CONTENT)
async def fahrzeug_loeschen(db: DbSession, _admin: CurrentAdmin, fahrzeug_id: int) -> None:
    fahrzeug = await stammdaten_service.get_fahrzeug(db, fahrzeug_id)
    if fahrzeug is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fahrzeug nicht gefunden.")
    await stammdaten_service.fahrzeug_loeschen(db, fahrzeug)


# --- Funktionen Einsatz -------------------------------------------------------


@router.get("/funktionen-einsatz", response_model=list[FunktionEinsatzOut])
async def funktionen_einsatz_liste(
    db: DbSession, _admin: CurrentAdmin
) -> list[FunktionEinsatzOut]:
    return await stammdaten_service.liste_funktionen_einsatz(db, nur_aktive=False)


@router.post(
    "/funktionen-einsatz", response_model=FunktionEinsatzOut, status_code=status.HTTP_201_CREATED
)
async def funktion_einsatz_anlegen(
    db: DbSession, _admin: CurrentAdmin, daten: FunktionEinsatzCreate
) -> FunktionEinsatzOut:
    return await stammdaten_service.funktion_einsatz_anlegen(db, daten)


@router.put("/funktionen-einsatz/{funktion_id}", response_model=FunktionEinsatzOut)
async def funktion_einsatz_aktualisieren(
    db: DbSession, _admin: CurrentAdmin, funktion_id: int, daten: FunktionEinsatzUpdate
) -> FunktionEinsatzOut:
    funktion = await stammdaten_service.get_funktion_einsatz(db, funktion_id)
    if funktion is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Funktion nicht gefunden.")
    return await stammdaten_service.funktion_einsatz_aktualisieren(db, funktion, daten)


@router.delete("/funktionen-einsatz/{funktion_id}", status_code=status.HTTP_204_NO_CONTENT)
async def funktion_einsatz_loeschen(
    db: DbSession, _admin: CurrentAdmin, funktion_id: int
) -> None:
    funktion = await stammdaten_service.get_funktion_einsatz(db, funktion_id)
    if funktion is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Funktion nicht gefunden.")
    await stammdaten_service.funktion_einsatz_loeschen(db, funktion)


# --- Gruppen --------------------------------------------------------------------


@router.get("/gruppen", response_model=list[GruppeOut])
async def gruppen_liste(db: DbSession, _admin: CurrentAdmin) -> list[GruppeOut]:
    return await stammdaten_service.liste_gruppen(db, nur_aktive=False)


@router.post("/gruppen", response_model=GruppeOut, status_code=status.HTTP_201_CREATED)
async def gruppe_anlegen(db: DbSession, _admin: CurrentAdmin, daten: GruppeCreate) -> GruppeOut:
    return await stammdaten_service.gruppe_anlegen(db, daten)


@router.put("/gruppen/{gruppe_id}", response_model=GruppeOut)
async def gruppe_aktualisieren(
    db: DbSession, _admin: CurrentAdmin, gruppe_id: int, daten: GruppeUpdate
) -> GruppeOut:
    gruppe = await stammdaten_service.get_gruppe(db, gruppe_id)
    if gruppe is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gruppe nicht gefunden.")
    return await stammdaten_service.gruppe_aktualisieren(db, gruppe, daten)


@router.delete("/gruppen/{gruppe_id}", status_code=status.HTTP_204_NO_CONTENT)
async def gruppe_loeschen(db: DbSession, _admin: CurrentAdmin, gruppe_id: int) -> None:
    gruppe = await stammdaten_service.get_gruppe(db, gruppe_id)
    if gruppe is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gruppe nicht gefunden.")
    await stammdaten_service.gruppe_loeschen(db, gruppe)


# --- Funktionen Dienststunden --------------------------------------------------


@router.get("/funktionen-dienststunden", response_model=list[FunktionDienststundenOut])
async def funktionen_dienststunden_liste(
    db: DbSession, _admin: CurrentAdmin
) -> list[FunktionDienststundenOut]:
    return await stammdaten_service.liste_funktionen_dienststunden(db, nur_aktive=False)


@router.post(
    "/funktionen-dienststunden",
    response_model=FunktionDienststundenOut,
    status_code=status.HTTP_201_CREATED,
)
async def funktion_dienststunden_anlegen(
    db: DbSession, _admin: CurrentAdmin, daten: FunktionDienststundenCreate
) -> FunktionDienststundenOut:
    return await stammdaten_service.funktion_dienststunden_anlegen(db, daten)


@router.put("/funktionen-dienststunden/{funktion_id}", response_model=FunktionDienststundenOut)
async def funktion_dienststunden_aktualisieren(
    db: DbSession,
    _admin: CurrentAdmin,
    funktion_id: int,
    daten: FunktionDienststundenUpdate,
) -> FunktionDienststundenOut:
    funktion = await stammdaten_service.get_funktion_dienststunden(db, funktion_id)
    if funktion is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Funktion nicht gefunden.")
    return await stammdaten_service.funktion_dienststunden_aktualisieren(db, funktion, daten)


@router.delete("/funktionen-dienststunden/{funktion_id}", status_code=status.HTTP_204_NO_CONTENT)
async def funktion_dienststunden_loeschen(
    db: DbSession, _admin: CurrentAdmin, funktion_id: int
) -> None:
    funktion = await stammdaten_service.get_funktion_dienststunden(db, funktion_id)
    if funktion is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Funktion nicht gefunden.")
    await stammdaten_service.funktion_dienststunden_loeschen(db, funktion)


# --- Einsatz-Felder (frei konfigurierbare Zusatzfelder) ------------------------


@router.get("/einsatz-felder", response_model=list[EinsatzFeldDefinitionOut])
async def einsatz_felder_liste(db: DbSession, _admin: CurrentAdmin) -> list[EinsatzFeldDefinitionOut]:
    return await stammdaten_service.liste_einsatz_felder(db, nur_aktive=False)


@router.post(
    "/einsatz-felder", response_model=EinsatzFeldDefinitionOut, status_code=status.HTTP_201_CREATED
)
async def einsatz_feld_anlegen(
    db: DbSession, _admin: CurrentAdmin, daten: EinsatzFeldDefinitionCreate
) -> EinsatzFeldDefinitionOut:
    return await stammdaten_service.einsatz_feld_anlegen(db, daten)


@router.put("/einsatz-felder/{feld_id}", response_model=EinsatzFeldDefinitionOut)
async def einsatz_feld_aktualisieren(
    db: DbSession, _admin: CurrentAdmin, feld_id: int, daten: EinsatzFeldDefinitionUpdate
) -> EinsatzFeldDefinitionOut:
    feld = await stammdaten_service.get_einsatz_feld(db, feld_id)
    if feld is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feld nicht gefunden.")
    return await stammdaten_service.einsatz_feld_aktualisieren(db, feld, daten)


@router.delete("/einsatz-felder/{feld_id}", status_code=status.HTTP_204_NO_CONTENT)
async def einsatz_feld_loeschen(db: DbSession, _admin: CurrentAdmin, feld_id: int) -> None:
    feld = await stammdaten_service.get_einsatz_feld(db, feld_id)
    if feld is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feld nicht gefunden.")
    await stammdaten_service.einsatz_feld_loeschen(db, feld)


# --- Personen -----------------------------------------------------------------


@router.get("/personen", response_model=list[PersonOut])
async def personen_liste(db: DbSession, _moderator: CurrentModerator) -> list[PersonOut]:
    """Bewusst für jeden Moderator lesbar (nicht nur Admin) – Gruppenführer
    brauchen die Personenliste z. B., um auf der Punkte-Seite eine Belohnung
    zu vergeben. Schreibende Personen-Endpunkte bleiben admin-only."""
    personen = await stammdaten_service.liste_personen(db)
    return await stammdaten_service.personen_zu_out(db, personen)


@router.post("/personen", response_model=PersonOut, status_code=status.HTTP_201_CREATED)
async def person_anlegen(db: DbSession, _admin: CurrentAdmin, daten: PersonCreate) -> PersonOut:
    person = await stammdaten_service.person_anlegen(db, daten)
    return await stammdaten_service.person_zu_out(db, person)


@router.put("/personen/{person_id}", response_model=PersonOut)
async def person_aktualisieren(
    db: DbSession, _admin: CurrentAdmin, person_id: int, daten: PersonUpdate
) -> PersonOut:
    person = await stammdaten_service.get_person(db, person_id)
    if person is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Person nicht gefunden.")
    person = await stammdaten_service.person_aktualisieren(db, person, daten)
    return await stammdaten_service.person_zu_out(db, person)


@router.delete("/personen/{person_id}", status_code=status.HTTP_204_NO_CONTENT)
async def person_loeschen(db: DbSession, _admin: CurrentAdmin, person_id: int) -> None:
    person = await stammdaten_service.get_person(db, person_id)
    if person is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Person nicht gefunden.")
    await stammdaten_service.person_loeschen(db, person)


@router.post("/personen/{person_id}/bild", response_model=PersonOut)
async def person_bild_hochladen(
    db: DbSession, _admin: CurrentAdmin, person_id: int, datei: UploadFile = File(...)
) -> PersonOut:
    person = await stammdaten_service.get_person(db, person_id)
    if person is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Person nicht gefunden.")
    person = await stammdaten_service.person_bild_speichern(db, person, datei)
    return await stammdaten_service.person_zu_out(db, person)


@router.put("/personen/{person_id}/pin", response_model=PersonOut)
async def person_pin_setzen(
    db: DbSession, _admin: CurrentAdmin, person_id: int, daten: PersonPinSetzen
) -> PersonOut:
    person = await stammdaten_service.get_person(db, person_id)
    if person is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Person nicht gefunden.")
    person = await stammdaten_service.person_pin_setzen(db, person, daten.pin)
    return await stammdaten_service.person_zu_out(db, person)


@router.post("/personen/{person_id}/bild-reservierung", response_model=PersonBildReservierungOut)
async def person_bild_reservierung_anlegen(
    db: DbSession, _admin: CurrentAdmin, person_id: int
) -> PersonBildReservierungOut:
    person = await stammdaten_service.get_person(db, person_id)
    if person is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Person nicht gefunden.")
    reservierung = await person_bild_reservierung_service.reservierung_anlegen(db, person_id)
    return PersonBildReservierungOut(token=reservierung.token, ablauf_am=reservierung.ablauf_am)


@router.post("/personen/{person_id}/barcode-mail", status_code=status.HTTP_204_NO_CONTENT)
async def person_barcode_per_mail(
    db: DbSession, _admin: CurrentAdmin, person_id: int
) -> None:
    person = await stammdaten_service.get_person(db, person_id)
    if person is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Person nicht gefunden.")
    if not person.email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Für diese Person ist keine E-Mail-Adresse hinterlegt."
        )
    if not await config_service.get(db, "notifier_email_aktiv", False):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="E-Mail-Versand ist in den Einstellungen nicht aktiv."
        )

    token = await barcode_service.token_fuer_person(db, person_id)
    png = barcode_service.render_png(token.token)
    vorlage = await config_service.get(db, "benachrichtigung_text_barcode_mail", "")
    try:
        nachricht = vorlage.format(person=person.name)
    except (KeyError, IndexError):
        nachricht = vorlage

    try:
        await EmailNotifier().send_an_mit_anhang(
            db,
            person.email,
            "Dein Barcode für Gerätehaus.app",
            nachricht,
            f"barcode-{person.id}.png",
            png,
            "image",
            "png",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Versand fehlgeschlagen: {exc}"
        ) from exc


@router.get("/personen/{person_id}/timeline", response_model=list[PersonEreignisOut])
async def person_timeline(
    db: DbSession, _admin: CurrentAdmin, person_id: int
) -> list[PersonEreignisOut]:
    person = await stammdaten_service.get_person(db, person_id)
    if person is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Person nicht gefunden.")
    return await stammdaten_service.liste_person_ereignisse(db, person_id)


@router.get("/personen/{person_id}/dienststunden", response_model=list[DienststundenSummeOut])
async def person_dienststunden_summen(
    db: DbSession, _admin: CurrentAdmin, person_id: int
) -> list[DienststundenSummeOut]:
    person = await stammdaten_service.get_person(db, person_id)
    if person is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Person nicht gefunden.")
    return await dienststunden_service.eigene_summen(db, person_id)


@router.post(
    "/personen/{person_id}/dienststunden",
    response_model=DienststundenEintragOut,
    status_code=status.HTTP_201_CREATED,
)
async def person_dienststunden_erfassen(
    db: DbSession, _admin: CurrentAdmin, person_id: int, daten: DienststundenErfassen
) -> DienststundenEintragOut:
    person = await stammdaten_service.get_person(db, person_id)
    if person is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Person nicht gefunden.")
    if not await dienststunden_service.funktion_existiert_und_aktiv(db, daten.funktion_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Funktion nicht gefunden oder inaktiv."
        )
    return await dienststunden_service.erfassen(db, person_id, daten)
