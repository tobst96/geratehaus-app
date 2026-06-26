from datetime import date

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.buchung import FahrzeugBuchung
from app.models.dienststunden import Dienststunden
from app.models.einsatz import Einsatz, EinsatzPerson
from app.models.funktion import FunktionDienststunden
from app.models.person import Person
from app.models.person_punkt import PersonPunkt
from app.schemas.dashboard import (
    DashboardOut,
    EinsaetzeProMonat,
    PunkteRangliste,
    SchwellenwertUeberschreitung,
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


async def _punkte_rangliste(db: AsyncSession, limit: int = 10) -> list[PunkteRangliste]:
    heute = date.today()
    stmt = (
        select(Person.id, Person.name, func.coalesce(func.sum(PersonPunkt.punkte), 0))
        .join(
            PersonPunkt,
            (PersonPunkt.person_id == Person.id) & (PersonPunkt.gueltig_bis >= heute),
        )
        .group_by(Person.id, Person.name)
        .order_by(func.coalesce(func.sum(PersonPunkt.punkte), 0).desc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    return [
        PunkteRangliste(person_id=pid, person_name=name, punkte=punkte)
        for pid, name, punkte in result.all()
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
        punkte_rangliste=await _punkte_rangliste(db),
        vab_faelle_anzahl=await _vab_faelle_anzahl(db),
        offene_buchungen_anzahl=await _offene_buchungen_anzahl(db),
        schwellenwert_ueberschreitungen=await _schwellenwert_ueberschreitungen(db),
    )
