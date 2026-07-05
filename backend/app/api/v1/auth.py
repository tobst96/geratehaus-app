from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select

from app.api.deps import CurrentPerson, DbSession
from app.core import mitglied_session
from app.core.rate_limit import rate_limit
from app.core.security import create_access_token
from app.models.barcode_token import BarcodeToken
from app.models.person import Person
from app.schemas.auth import (
    BarcodeEinscannen,
    BarcodeIdentitaet,
    BarcodeVorschau,
    MeinProfil,
    ModeratorToken,
    NamePinLogin,
    NamePinVorschau,
    PersonAuswahl,
    PinAnfordern,
)
from app.db.session import AsyncSessionLocal
from app.services import (
    barcode_service,
    feature_modul_service,
    mitglied_login_reservierung_service,
    moderator_service,
    pin_service,
    stammdaten_service,
)

router = APIRouter(prefix="/auth", tags=["auth"])

NAME_COOKIE = "geraetehaus_name"
NAME_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365 * 5  # 5 Jahre


def _setze_namens_cookie(response: Response, name: str) -> None:
    """Setzt das Mitglieder-Identitäts-Cookie mit einem SIGNIERTEN Wert (nur nach
    echter Identifikation via Barcode/Name+PIN). Der Name steht nicht mehr im
    Klartext im Cookie und ist damit nicht fälschbar."""
    response.set_cookie(
        NAME_COOKIE,
        mitglied_session.signiere_name(name),
        max_age=NAME_COOKIE_MAX_AGE_SECONDS,
        httponly=True,
        samesite="lax",
    )


@router.post("/abmelden", status_code=status.HTTP_204_NO_CONTENT)
async def abmelden(response: Response) -> None:
    """Löscht den Namens-Cookie, mit dem sich Personen ohne echten Login
    identifizieren (Barcode-Scan, Mitglieder-Login). Anders als beim
    Moderator-Logout (rein clientseitig, da JWT im localStorage) muss der
    Server hier aktiv werden, weil das Cookie httponly ist."""
    response.delete_cookie(NAME_COOKIE)


@router.get("/mein-profil", response_model=MeinProfil)
async def mein_profil(person: CurrentPerson) -> MeinProfil:
    return MeinProfil(
        name=person.name,
        bild_url=person.bild_url,
        gruppe_id=person.gruppe_id,
        funktion_id=person.funktion_id,
    )


@router.post(
    "/barcode", response_model=BarcodeIdentitaet, dependencies=[Depends(rate_limit(20, 60))]
)
async def barcode_einscannen(
    db: DbSession, response: Response, daten: BarcodeEinscannen, background_tasks: BackgroundTasks
) -> BarcodeIdentitaet:
    """Löst einen gescannten Personen-Barcode zur Identität auf und trägt sie
    wie /auth/name im Namens-Cookie ein – so identifiziert sich die Person für
    alle nachfolgenden Aktionen (z. B. Sitzplatz-Zuweisung) ohne Tippen."""
    result = await db.execute(select(BarcodeToken).where(BarcodeToken.token == daten.token))
    barcode = result.scalar_one_or_none()
    if barcode is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Barcode nicht erkannt.")

    person_result = await db.execute(select(Person).where(Person.id == barcode.person_id))
    person = person_result.scalar_one_or_none()
    if person is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Person nicht gefunden.")

    if barcode.ablauf_am is not None and barcode.ablauf_am < datetime.utcnow():
        if person.email and person.benachrichtigungen_aktiv:
            person_id_snapshot = person.id

            async def _erneuerung_im_hintergrund() -> None:
                async with AsyncSessionLocal() as bg_db:
                    try:
                        p = (await bg_db.execute(select(Person).where(Person.id == person_id_snapshot))).scalar_one()
                        await barcode_service.erneuerung_mail_senden(bg_db, p)
                    except Exception:
                        pass

            background_tasks.add_task(_erneuerung_im_hintergrund)
        raise HTTPException(
            status_code=status.HTTP_410_GONE, detail=f"Barcode von {person.name} ist abgelaufen."
        )

    barcode.last_used_at = datetime.utcnow()
    await db.commit()

    _setze_namens_cookie(response, person.name)
    return BarcodeIdentitaet(name=person.name)


@router.post(
    "/mitglied-login-reservierungen/{token}/einloesen",
    response_model=BarcodeIdentitaet,
    dependencies=[Depends(rate_limit(30, 60))],
)
async def mitglied_login_einloesen(db: DbSession, response: Response, token: str) -> BarcodeIdentitaet:
    """Wird vom URSPRÜNGLICHEN Gerät aufgerufen (nicht vom Handy!), sobald
    Polling ergibt, dass die Auswahl auf dem Handy bestätigt wurde – setzt
    den Namens-Cookie auf diesem Gerät, wie /auth/barcode."""
    reservierung = await mitglied_login_reservierung_service.get_reservierung_by_token(db, token)
    if reservierung is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservierung nicht gefunden.")
    if reservierung.eingeloest:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Diese Reservierung wurde bereits genutzt."
        )
    if not reservierung.bestaetigt or reservierung.person_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Noch keine Person auf dem Handy bestätigt."
        )
    if mitglied_login_reservierung_service.ist_abgelaufen(reservierung):
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Diese Reservierung ist abgelaufen.")

    person = await stammdaten_service.get_person(db, reservierung.person_id)
    if person is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Person nicht gefunden.")

    reservierung.eingeloest = True
    await db.commit()

    _setze_namens_cookie(response, person.name)
    return BarcodeIdentitaet(name=person.name)


@router.get(
    "/barcode-vorschau/{token}",
    response_model=BarcodeVorschau,
    dependencies=[Depends(rate_limit(20, 60))],
)
async def barcode_vorschau(db: DbSession, token: str) -> BarcodeVorschau:
    """Liefert Name und Bild zu einem Token, ohne Identität/Cookie zu setzen –
    für die Live-Vorschau während des Scannens (z. B. Foto neben dem
    Sitzplatz-Formular). Bewusst ohne Ablaufprüfung, reine Anzeige."""
    result = await db.execute(select(BarcodeToken).where(BarcodeToken.token == token))
    barcode = result.scalar_one_or_none()
    if barcode is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Barcode nicht erkannt.")

    person_result = await db.execute(select(Person).where(Person.id == barcode.person_id))
    person = person_result.scalar_one_or_none()
    if person is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Person nicht gefunden.")

    return BarcodeVorschau(
        name=person.name,
        bild_url=person.bild_url,
        gruppe_id=person.gruppe_id,
        funktion_id=person.funktion_id,
    )


def _pin_gesperrt_http(sperre: "stammdaten_service.PinGesperrtError") -> HTTPException:
    """429 mit Restdauer (Minuten) bei temporär gesperrtem PIN-Login."""
    minuten = max(1, round(sperre.verbleibend_sekunden / 60))
    return HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail=f"Zu viele Fehlversuche. PIN-Login für {minuten} Minute(n) gesperrt.",
    )


@router.get(
    "/personen", response_model=list[PersonAuswahl], dependencies=[Depends(rate_limit(30, 60))]
)
async def personen_auswahl(db: DbSession, suche: str = "") -> list[PersonAuswahl]:
    """Namensauswahl für den Kiosk, wenn das Barcode-Modul AUS ist. Liefert nur
    id/name/bild + ob ein PIN gesetzt ist – keine E-Mail/PIN. Bei aktivem
    Barcode-Modul bewusst 404, damit die Personenliste nicht öffentlich ist."""
    if await feature_modul_service.ist_aktiv(db, "barcode"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nicht verfügbar.")
    begriff = suche.strip()
    query = select(Person).order_by(Person.name)
    if begriff:
        query = query.where(Person.name.ilike(f"%{begriff}%"))
    personen = (await db.execute(query.limit(50))).scalars().all()
    return [
        PersonAuswahl(
            id=p.id,
            name=p.name,
            bild_url=p.bild_url,
            pin_gesetzt=p.pin_gesetzt,
            funktion_id=p.funktion_id,
            gruppe_id=p.gruppe_id,
        )
        for p in personen
    ]


@router.post(
    "/name-pin/pruefen",
    response_model=NamePinVorschau,
    dependencies=[Depends(rate_limit(20, 60))],
)
async def name_pin_pruefen(db: DbSession, daten: NamePinLogin) -> NamePinVorschau:
    """Prüft den PIN, OHNE einzuloggen (kein Cookie) – nur für die Bildvorschau am
    Kiosk, sobald der korrekte PIN eingegeben wurde. Bei falschem/fehlendem PIN 401,
    bei zu vielen Fehlversuchen 429 (temporäre Sperre)."""
    person = await stammdaten_service.get_person(db, daten.person_id)
    if person is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Person nicht gefunden.")
    if not person.pin_gesetzt:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="PIN falsch.")
    try:
        korrekt = await stammdaten_service.pin_login_versuch(db, person, daten.pin)
    except stammdaten_service.PinGesperrtError as sperre:
        raise _pin_gesperrt_http(sperre)
    if not korrekt:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="PIN falsch.")
    return NamePinVorschau(name=person.name, bild_url=person.bild_url)


@router.post(
    "/name-pin", response_model=BarcodeIdentitaet, dependencies=[Depends(rate_limit(20, 60))]
)
async def name_pin_login(db: DbSession, response: Response, daten: NamePinLogin) -> BarcodeIdentitaet:
    """Identifiziert eine Person per Auswahl + persönlichem PIN (Standard, wenn das
    Barcode-Modul AUS ist) und setzt den Namens-Cookie wie /auth/barcode. Ohne
    gesetzten PIN wird bewusst nicht eingeloggt (428) – das Frontend zeigt dann
    den Button „PIN anfordern"."""
    person = await stammdaten_service.get_person(db, daten.person_id)
    if person is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Person nicht gefunden.")
    if not person.pin_gesetzt:
        raise HTTPException(status_code=status.HTTP_428_PRECONDITION_REQUIRED, detail="kein_pin")
    try:
        korrekt = await stammdaten_service.pin_login_versuch(db, person, daten.pin)
    except stammdaten_service.PinGesperrtError as sperre:
        raise _pin_gesperrt_http(sperre)
    if not korrekt:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="PIN falsch.")

    _setze_namens_cookie(response, person.name)
    return BarcodeIdentitaet(name=person.name)


@router.post(
    "/pin-anfordern", status_code=status.HTTP_202_ACCEPTED, dependencies=[Depends(rate_limit(10, 60))]
)
async def pin_anfordern(db: DbSession, daten: PinAnfordern) -> dict[str, str]:
    """Kiosk-Fallback für Personen ohne PIN: hat die Person eine E-Mail, bekommt
    sie einen Self-Service-Link; sonst wird eine Moderator-Freigabe angestoßen."""
    person = await stammdaten_service.get_person(db, daten.person_id)
    if person is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Person nicht gefunden.")
    weg = await pin_service.pin_anfordern(db, person)
    return {"weg": weg}


@router.post(
    "/moderator/login", response_model=ModeratorToken, dependencies=[Depends(rate_limit(10, 60))]
)
async def moderator_login(
    db: DbSession, form_data: Annotated[OAuth2PasswordRequestForm, Depends()]
) -> ModeratorToken:
    try:
        moderator = await moderator_service.login_pruefen(db, form_data.username, form_data.password)
    except moderator_service.ModeratorGesperrtError as sperre:
        minuten = max(1, round(sperre.verbleibend_sekunden / 60))
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Zu viele Fehlversuche. Login für {minuten} Minute(n) gesperrt.",
        )
    if moderator is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Benutzername oder Passwort falsch.",
        )
    token = create_access_token(subject=moderator.username, extra_claims={"rolle": moderator.rolle})
    return ModeratorToken(access_token=token)
