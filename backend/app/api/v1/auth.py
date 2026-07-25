from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Cookie, Depends, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select

from app.api.deps import CurrentPerson, DbSession
from app.core import datei_token, mitglied_session, gruppenfuehrer_2fa_session
from app.core.rate_limit import rate_limit
from app.core.security import create_access_token
from app.models.barcode_token import BarcodeToken
from app.models.person import Person
from app.schemas.auth import (
    BarcodeEinscannen,
    BarcodeIdentitaet,
    BarcodeVorschau,
    MeinProfil,
    Gruppenfuehrer2FA,
    Gruppenfuehrer2FAEinrichten,
    Gruppenfuehrer2FAEinrichtenErgebnis,
    GruppenfuehrerLoginErgebnis,
    GruppenfuehrerToken,
    NamePinLogin,
    NamePinVorschau,
    PersonAuswahl,
    PinAnfordern,
)
from app.db.session import AsyncSessionLocal
from app.services import (
    audit_service,
    barcode_service,
    feature_modul_service,
    mitglied_login_reservierung_service,
    gruppenfuehrer_service,
    pin_service,
    stammdaten_service,
    zwei_faktor_service,
)
from app.services.config_service import config_service

TRUSTED_DEVICE_COOKIE = "gruppenfuehrer_trusted_device"
TRUSTED_DEVICE_MAX_AGE_SECONDS = 60 * 60 * 24 * zwei_faktor_service.TRUSTED_DEVICE_TAGE

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
    Gruppenführer-Logout (rein clientseitig, da JWT im localStorage) muss der
    Server hier aktiv werden, weil das Cookie httponly ist."""
    response.delete_cookie(NAME_COOKIE)


@router.get("/mein-profil", response_model=MeinProfil)
async def mein_profil(person: CurrentPerson) -> MeinProfil:
    return MeinProfil(
        name=person.name,
        bild_url=datei_token.signierte_url(person.bild_url),
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
        bild_url=datei_token.signierte_url(person.bild_url),
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
            bild_url=datei_token.signierte_url(p.bild_url),
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
    return NamePinVorschau(name=person.name, bild_url=datei_token.signierte_url(person.bild_url))


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
    sie einen Self-Service-Link; sonst wird eine Gruppenführer-Freigabe angestoßen."""
    person = await stammdaten_service.get_person(db, daten.person_id)
    if person is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Person nicht gefunden.")
    weg = await pin_service.pin_anfordern(db, person)
    return {"weg": weg}


def _gruppenfuehrer_token(person) -> str:
    return create_access_token(subject=person.name, extra_claims={"rolle": person.gruppenfuehrer_rolle})


@router.post(
    "/gruppenfuehrer/login",
    response_model=GruppenfuehrerLoginErgebnis,
    dependencies=[Depends(rate_limit(10, 60))],
)
async def gruppenfuehrer_login(
    db: DbSession,
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    gruppenfuehrer_trusted_device: Annotated[str | None, Cookie()] = None,
) -> GruppenfuehrerLoginErgebnis:
    try:
        person = await gruppenfuehrer_service.login_pruefen(db, form_data.username, form_data.password)
    except gruppenfuehrer_service.GruppenfuehrerGesperrtError as sperre:
        minuten = max(1, round(sperre.verbleibend_sekunden / 60))
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Zu viele Fehlversuche. Login für {minuten} Minute(n) gesperrt.",
        )
    if person is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Name oder Passwort falsch.",
        )

    # Zugang ohne aktives 2FA: entweder Pflicht-Einrichtung erzwingen oder – wenn
    # die Pflicht abgeschaltet ist – wie bisher direkt ein Token ausstellen.
    if not person.zwei_faktor_aktiv:
        pflicht = bool(await config_service.get(db, "zwei_faktor_pflicht", True))
        if pflicht:
            return GruppenfuehrerLoginErgebnis(
                einrichtung_erforderlich=True,
                email_gesetzt=bool(person.email),
                challenge=gruppenfuehrer_2fa_session.signiere_challenge(person.id),
            )
        return GruppenfuehrerLoginErgebnis(access_token=_gruppenfuehrer_token(person))

    # 2FA aktiv, aber bereits vertrauenswürdiges Gerät → direkt Token ausstellen.
    if await zwei_faktor_service.trusted_device_gueltig(db, person, gruppenfuehrer_trusted_device):
        return GruppenfuehrerLoginErgebnis(access_token=_gruppenfuehrer_token(person))

    # 2FA: OTP per E-Mail senden (Best-Effort – ohne E-Mail bleibt der
    # Recovery-Code-Weg) und Challenge für den zweiten Schritt zurückgeben.
    try:
        await zwei_faktor_service.otp_erzeugen_und_senden(db, person)
    except ValueError:
        pass
    return GruppenfuehrerLoginErgebnis(
        zwei_faktor_erforderlich=True,
        challenge=gruppenfuehrer_2fa_session.signiere_challenge(person.id),
    )


@router.post(
    "/gruppenfuehrer/2fa/einrichten",
    response_model=Gruppenfuehrer2FAEinrichtenErgebnis,
    dependencies=[Depends(rate_limit(10, 60))],
)
async def gruppenfuehrer_2fa_einrichten(
    db: DbSession, daten: Gruppenfuehrer2FAEinrichten
) -> Gruppenfuehrer2FAEinrichtenErgebnis:
    """Erzwungene 2FA-Einrichtung (Pflicht): aktiviert 2FA für den per `challenge`
    ausgewiesenen Zugang, liefert die Recovery-Codes **einmalig** zurück und sendet
    sofort einen OTP für den anschließenden zweiten Schritt (`/gruppenfuehrer/2fa`)."""
    person_id = gruppenfuehrer_2fa_session.lese_challenge(daten.challenge)
    if person_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Anmeldung abgelaufen. Bitte erneut mit Passwort anmelden.",
        )
    person = await stammdaten_service.get_person(db, person_id)
    if person is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Nicht angemeldet.")
    if person.zwei_faktor_aktiv:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA ist bereits aktiv. Bitte erneut mit Passwort anmelden.",
        )
    if not person.email:
        neue_email = (daten.email or "").strip()
        if not neue_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Für 2FA muss eine E-Mail hinterlegt werden.",
            )
        person.email = neue_email
    try:
        codes = await zwei_faktor_service.aktivieren(db, person)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    # OTP für den zweiten Schritt senden (Best-Effort – Recovery-Codes bleiben Fallback).
    try:
        await zwei_faktor_service.otp_erzeugen_und_senden(db, person)
    except ValueError:
        pass
    await audit_service.protokolliere(
        db, person.name, "gruppenfuehrer_2fa_aktiviert", "gruppenfuehrer", person.id
    )
    return Gruppenfuehrer2FAEinrichtenErgebnis(
        recovery_codes=codes,
        challenge=gruppenfuehrer_2fa_session.signiere_challenge(person.id),
    )


@router.post(
    "/gruppenfuehrer/2fa",
    response_model=GruppenfuehrerLoginErgebnis,
    dependencies=[Depends(rate_limit(10, 60))],
)
async def moderator_2fa(db: DbSession, response: Response, daten: Gruppenfuehrer2FA) -> GruppenfuehrerLoginErgebnis:
    """Zweiter Login-Schritt: prüft den E-Mail-OTP **oder** einen Recovery-Code
    zum vorher ausgestellten `challenge`-Token."""
    person_id = gruppenfuehrer_2fa_session.lese_challenge(daten.challenge)
    if person_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Anmeldung abgelaufen. Bitte erneut mit Passwort anmelden.",
        )
    person = await stammdaten_service.get_person(db, person_id)
    if person is None or not person.zwei_faktor_aktiv:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Nicht angemeldet.")

    ok = await zwei_faktor_service.otp_pruefen(db, person, daten.code) or (
        await zwei_faktor_service.recovery_code_pruefen(db, person, daten.code)
    )
    if not ok:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Code ungültig oder abgelaufen.")

    if daten.angemeldet_bleiben:
        roh = await zwei_faktor_service.trusted_device_ausstellen(db, person)
        response.set_cookie(
            TRUSTED_DEVICE_COOKIE,
            roh,
            max_age=TRUSTED_DEVICE_MAX_AGE_SECONDS,
            httponly=True,
            samesite="lax",
        )
    return GruppenfuehrerLoginErgebnis(access_token=_gruppenfuehrer_token(person))
