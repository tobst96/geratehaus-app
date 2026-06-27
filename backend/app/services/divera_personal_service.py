"""Divera-Personal-Abgleich: schlägt neue Personen (in Divera, aber noch nicht
im System) und E-Mail-Aktualisierungen (für bestehende, per divera_user_id
oder Name gematchte Personen) vor. Vorschläge werden in DiveraVorschlag
zwischengespeichert, bis ein Moderator sie über das "Vorschlag"-Popup
übernimmt oder ignoriert (siehe app/api/v1/divera_personal.py)."""

from datetime import datetime, timedelta, timezone
from typing import Any

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.divera_vorschlag import DiveraVorschlag
from app.models.person import Person
from app.services import divera_client, stammdaten_service
from app.services.config_service import config_service

logger = structlog.get_logger(__name__)

VORSCHLAG_AUFBEWAHRUNG_TAGE = 365


def _person_normalisieren(roh: dict[str, Any]) -> dict[str, Any] | None:
    """Bildet unterschiedliche Divera-Antwortformen auf ein einheitliches
    {divera_user_id, name, email} ab. Bei abweichenden Feldnamen (je nach
    Divera-Tarif) genügt eine Anpassung hier, analog zu
    divera_service._alarm_normalisieren()."""
    divera_user_id = roh.get("id") or roh.get("user_id")
    if divera_user_id is None:
        return None

    vorname = roh.get("firstname") or roh.get("vorname") or ""
    nachname = roh.get("lastname") or roh.get("nachname") or ""
    name = (roh.get("name") or roh.get("fullname") or f"{vorname} {nachname}").strip()
    email = roh.get("email") or roh.get("mail")
    if not name:
        return None

    return {
        "divera_user_id": str(divera_user_id),
        "vorname": vorname or None,
        "nachname": nachname or None,
        "name": name,
        "email": email or None,
    }


async def _bestehender_vorschlag(
    db: AsyncSession, divera_user_id: str, art: str
) -> DiveraVorschlag | None:
    result = await db.execute(
        select(DiveraVorschlag).where(
            DiveraVorschlag.divera_user_id == divera_user_id, DiveraVorschlag.art == art
        )
    )
    return result.scalar_one_or_none()


async def _person_finden(db: AsyncSession, divera_user_id: str, name: str) -> Person | None:
    result = await db.execute(select(Person).where(Person.divera_user_id == divera_user_id))
    person = result.scalar_one_or_none()
    if person is not None:
        return person
    result = await db.execute(select(Person).where(Person.name == name))
    return result.scalar_one_or_none()


async def synchronisiere_personal(db: AsyncSession) -> int:
    """Pollt die Divera-API und legt neue DiveraVorschlag-Einträge an (neue
    Personen und E-Mail-Abweichungen). Gibt die Anzahl neu erzeugter
    Vorschläge zurück. Bereits entschiedene/offene Vorschläge für dieselbe
    divera_user_id+Art werden nicht erneut erzeugt."""
    divera_aktiv = await config_service.get(db, "divera_aktiv", False)
    api_key = await config_service.get(db, "divera_api_key", "")
    if not divera_aktiv or not api_key:
        return 0

    rohdaten = await divera_client.hole_personal(api_key)
    anzahl_neu = 0
    for roh in rohdaten:
        person_daten = _person_normalisieren(roh)
        if person_daten is None:
            logger.warning("divera_person_unvollstaendig", roh=roh)
            continue

        bestehende_person = await _person_finden(
            db, person_daten["divera_user_id"], person_daten["name"]
        )

        if bestehende_person is None:
            if await _bestehender_vorschlag(db, person_daten["divera_user_id"], "neu") is not None:
                continue
            db.add(
                DiveraVorschlag(
                    divera_user_id=person_daten["divera_user_id"],
                    art="neu",
                    vorschlag_daten=person_daten,
                    status="offen",
                )
            )
            anzahl_neu += 1
            continue

        divera_email = person_daten["email"]
        if divera_email and divera_email != bestehende_person.email:
            if await _bestehender_vorschlag(db, person_daten["divera_user_id"], "email_update") is not None:
                continue
            db.add(
                DiveraVorschlag(
                    divera_user_id=person_daten["divera_user_id"],
                    art="email_update",
                    vorschlag_daten={
                        "alte_email": bestehende_person.email,
                        "neue_email": divera_email,
                        "name": person_daten["name"],
                    },
                    bestehende_person_id=bestehende_person.id,
                    status="offen",
                )
            )
            anzahl_neu += 1

    await db.commit()
    logger.info(
        "divera_personal_synchronisation_abgeschlossen",
        anzahl_neu=anzahl_neu,
        anzahl_gesamt=len(rohdaten),
    )
    return anzahl_neu


async def get_vorschlag(db: AsyncSession, vorschlag_id: int) -> DiveraVorschlag | None:
    result = await db.execute(select(DiveraVorschlag).where(DiveraVorschlag.id == vorschlag_id))
    return result.scalar_one_or_none()


async def liste_offene_vorschlaege(db: AsyncSession) -> list[DiveraVorschlag]:
    result = await db.execute(
        select(DiveraVorschlag)
        .where(DiveraVorschlag.status == "offen")
        .order_by(DiveraVorschlag.erstellt_am)
    )
    return list(result.scalars().all())


async def entscheide_vorschlag(
    db: AsyncSession, vorschlag: DiveraVorschlag, aktion: str
) -> DiveraVorschlag:
    if aktion == "uebernehmen":
        if vorschlag.art == "neu":
            daten = vorschlag.vorschlag_daten
            person = Person(
                vorname=daten.get("vorname"),
                nachname=daten.get("nachname"),
                name=daten["name"],
                email=daten.get("email"),
                divera_user_id=vorschlag.divera_user_id,
            )
            db.add(person)
            await db.flush()
        else:
            result = await db.execute(
                select(Person).where(Person.id == vorschlag.bestehende_person_id)
            )
            person = result.scalar_one_or_none()
            if person is not None:
                person.email = vorschlag.vorschlag_daten["neue_email"]
                if not person.divera_user_id:
                    person.divera_user_id = vorschlag.divera_user_id
                await stammdaten_service.person_ereignis_protokollieren(
                    db,
                    person.id,
                    "stammdaten_geaendert",
                    f"E-Mail per Divera-Vorschlag aktualisiert: „{vorschlag.vorschlag_daten.get('alte_email') or '–'}“ → „{vorschlag.vorschlag_daten['neue_email']}“",
                )
        vorschlag.status = "uebernommen"
    else:
        vorschlag.status = "ignoriert"

    vorschlag.entschieden_am = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(vorschlag)
    return vorschlag


async def raeume_alte_vorschlaege_auf(db: AsyncSession) -> int:
    """Löscht Vorschläge (offen oder entschieden), die älter als 1 Jahr sind."""
    grenze = datetime.now(timezone.utc) - timedelta(days=VORSCHLAG_AUFBEWAHRUNG_TAGE)
    result = await db.execute(select(DiveraVorschlag).where(DiveraVorschlag.erstellt_am < grenze))
    alte_vorschlaege = list(result.scalars().all())
    for vorschlag in alte_vorschlaege:
        await db.delete(vorschlag)
    if alte_vorschlaege:
        await db.commit()
    return len(alte_vorschlaege)
