from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.buchung import FahrzeugBuchung
from app.models.dienststunden import Dienststunden
from app.models.einsatz import Einsatz, EinsatzPerson
from app.models.funktion import FunktionDienststunden
from app.models.person import Person
from app.schemas.dashboard import (
    DashboardOut,
    EinsaetzeProMonat,
    SchwellenwertUeberschreitung,
    TopAktive,
)


async def _einsaetze_pro_monat(db: AsyncSession, monate: int = 12) -> list[EinsaetzeProMonat]:
    monat_ausdruck = func.to_char(Einsatz.zeitpunkt, "YYYY-MM")
    stmt = (
        select(monat_ausdruck.label("monat"), func.count(Einsatz.id))
        .where(Einsatz.archiviert.is_(False))
        .group_by(monat_ausdruck)
        .order_by(monat_ausdruck.desc())
        .limit(monate)
    )
    result = await db.execute(stmt)
    return [EinsaetzeProMonat(monat=monat, anzahl=anzahl) for monat, anzahl in result.all()]


async def _top_aktive(db: AsyncSession, limit: int = 10) -> list[TopAktive]:
    stmt = (
        select(Person.id, Person.name, func.count(EinsatzPerson.id))
        .join(EinsatzPerson, EinsatzPerson.person_id == Person.id)
        .group_by(Person.id, Person.name)
        .order_by(func.count(EinsatzPerson.id).desc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    return [
        TopAktive(person_id=pid, person_name=name, anzahl_teilnahmen=anzahl)
        for pid, name, anzahl in result.all()
    ]


async def _vab_faelle_anzahl(db: AsyncSession) -> int:
    stmt = select(func.count(EinsatzPerson.id)).where(EinsatzPerson.vab.is_(True))
    result = await db.execute(stmt)
    return result.scalar_one()


async def _offene_buchungen_anzahl(db: AsyncSession) -> int:
    stmt = select(func.count(FahrzeugBuchung.id)).where(FahrzeugBuchung.status == "ausstehend")
    result = await db.execute(stmt)
    return result.scalar_one()


async def _schwellenwert_ueberschreitungen(db: AsyncSession) -> list[SchwellenwertUeberschreitung]:
    stmt = (
        select(
            Person.id,
            Person.name,
            FunktionDienststunden.id,
            FunktionDienststunden.name,
            func.sum(Dienststunden.stunden),
            FunktionDienststunden.schwellenwert_stunden,
        )
        .join(Dienststunden, Dienststunden.person_id == Person.id)
        .join(FunktionDienststunden, FunktionDienststunden.id == Dienststunden.funktion_id)
        .where(FunktionDienststunden.aktiv.is_(True), FunktionDienststunden.schwellenwert_stunden > 0)
        .group_by(
            Person.id, Person.name, FunktionDienststunden.id, FunktionDienststunden.name,
            FunktionDienststunden.schwellenwert_stunden,
        )
        .having(func.sum(Dienststunden.stunden) >= FunktionDienststunden.schwellenwert_stunden)
    )
    result = await db.execute(stmt)
    return [
        SchwellenwertUeberschreitung(
            person_id=pid,
            person_name=pname,
            funktion_id=fid,
            funktion_name=fname,
            summe_stunden=summe,
            schwellenwert_stunden=schwellenwert,
        )
        for pid, pname, fid, fname, summe, schwellenwert in result.all()
    ]


async def dashboard_daten(db: AsyncSession) -> DashboardOut:
    return DashboardOut(
        einsaetze_pro_monat=await _einsaetze_pro_monat(db),
        top_aktive=await _top_aktive(db),
        vab_faelle_anzahl=await _vab_faelle_anzahl(db),
        offene_buchungen_anzahl=await _offene_buchungen_anzahl(db),
        schwellenwert_ueberschreitungen=await _schwellenwert_ueberschreitungen(db),
    )
