from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.einsatz import Einsatz, EinsatzPerson
from app.models.einsatz_ereignis import EinsatzEreignis
from app.schemas.einsatz import EinsatzAnlegen, TeilnahmeAnlegen
from app.services import notifier_service


async def ereignis_protokollieren(
    db: AsyncSession, einsatz_id: int, typ: str, beschreibung: str
) -> None:
    db.add(EinsatzEreignis(einsatz_id=einsatz_id, typ=typ, beschreibung=beschreibung))
    await db.commit()


async def liste_ereignisse(db: AsyncSession, einsatz_id: int) -> list[EinsatzEreignis]:
    result = await db.execute(
        select(EinsatzEreignis)
        .where(EinsatzEreignis.einsatz_id == einsatz_id)
        .order_by(EinsatzEreignis.zeitpunkt)
    )
    return list(result.scalars().all())

_TEILNAHME_DETAILS = selectinload(Einsatz.teilnahmen).options(
    selectinload(EinsatzPerson.person),
    selectinload(EinsatzPerson.fahrzeug),
    selectinload(EinsatzPerson.funktion),
)


async def liste_einsaetze(db: AsyncSession, nur_unarchiviert: bool = True) -> list[Einsatz]:
    stmt = select(Einsatz).options(_TEILNAHME_DETAILS).order_by(Einsatz.zeitpunkt.desc())
    if nur_unarchiviert:
        stmt = stmt.where(Einsatz.archiviert.is_(False))
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_einsatz(db: AsyncSession, einsatz_id: int) -> Einsatz | None:
    stmt = select(Einsatz).options(_TEILNAHME_DETAILS).where(Einsatz.id == einsatz_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def einsatz_anlegen(db: AsyncSession, daten: EinsatzAnlegen, quelle: str = "manuell") -> Einsatz:
    einsatz = Einsatz(titel=daten.titel, zeitpunkt=daten.zeitpunkt, quelle=quelle)
    db.add(einsatz)
    await db.commit()
    await ereignis_protokollieren(
        db, einsatz.id, "angelegt", f"Einsatz angelegt ({quelle})"
    )
    await notifier_service.benachrichtige(db, "benachrichtigung_neuer_einsatz", titel=einsatz.titel)
    geladen = await get_einsatz(db, einsatz.id)
    assert geladen is not None
    return geladen


async def teilnahme_eintragen(
    db: AsyncSession, einsatz: Einsatz, person_id: int, daten: TeilnahmeAnlegen
) -> EinsatzPerson:
    """Legt die Teilnahme an, oder aktualisiert sie, falls die Person bereits
    für diesen Einsatz eingetragen ist."""
    stmt = select(EinsatzPerson).where(
        EinsatzPerson.einsatz_id == einsatz.id, EinsatzPerson.person_id == person_id
    )
    result = await db.execute(stmt)
    teilnahme = result.scalar_one_or_none()
    if teilnahme is None:
        teilnahme = EinsatzPerson(einsatz_id=einsatz.id, person_id=person_id)
        db.add(teilnahme)

    ist_neu = teilnahme.id is None
    teilnahme.fahrzeug_id = daten.fahrzeug_id
    teilnahme.sitzplatz_id = daten.sitzplatz_id
    teilnahme.funktion_id = daten.funktion_id
    teilnahme.vab = daten.vab
    teilnahme.atemschutzminuten = daten.atemschutzminuten
    teilnahme.nur_geraetehaus = daten.nur_geraetehaus
    teilnahme.auf_anfahrt = daten.auf_anfahrt
    teilnahme.bemerkung = daten.bemerkung
    await db.commit()

    geladen = await db.execute(
        select(EinsatzPerson)
        .options(
            selectinload(EinsatzPerson.person),
            selectinload(EinsatzPerson.fahrzeug),
            selectinload(EinsatzPerson.funktion),
        )
        .where(EinsatzPerson.id == teilnahme.id)
    )
    ergebnis = geladen.scalar_one()

    if ergebnis.nur_geraetehaus:
        ort = "Einsatzbereit im Feuerwehrhaus"
    elif ergebnis.auf_anfahrt:
        ort = "Auf Anfahrt"
    elif ergebnis.fahrzeug_name:
        ort = ergebnis.fahrzeug_name
    else:
        ort = "ohne Fahrzeugzuordnung"
    verb = "eingetragen" if ist_neu else "aktualisiert"
    await ereignis_protokollieren(
        db, einsatz.id, "teilnahme", f"{ergebnis.person_name} {verb}: {ort}"
    )
    return ergebnis


async def zusatzfelder_aktualisieren(
    db: AsyncSession, einsatz: Einsatz, zusatzfelder: dict
) -> Einsatz:
    einsatz.zusatzfelder = {**einsatz.zusatzfelder, **zusatzfelder}
    await db.commit()
    await ereignis_protokollieren(db, einsatz.id, "details", "Einsatzdetails aktualisiert")
    geladen = await get_einsatz(db, einsatz.id)
    assert geladen is not None
    return geladen


async def einsatz_abschliessen(db: AsyncSession, einsatz: Einsatz) -> Einsatz:
    einsatz.status = "abgeschlossen"
    await db.commit()
    await ereignis_protokollieren(db, einsatz.id, "abgeschlossen", "Einsatz abgeschlossen")
    geladen = await get_einsatz(db, einsatz.id)
    assert geladen is not None
    return geladen
