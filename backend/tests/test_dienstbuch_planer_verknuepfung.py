"""Automatische Dienstbuch-Verknüpfung bestätigter Planer-Termine (täglicher
Scheduler-Job) - Backlog: Modul Dienstbuch Planer, Phase 1."""

from datetime import date, timedelta

from sqlalchemy import select

from app.jobs.scheduler import _dienstbuch_plan_verknuepfung_job
from app.models.dienstbuch import Dienstbuch
from app.models.dienstbuch_planer import DienstbuchPlanTermin, DienstbuchPlanTerminEreignis


async def _termin(
    db, *, status="bestaetigt", zieldatum=None, ist_platzhalter=False, dienstbuch_id=None, titel="Übung"
):
    termin = DienstbuchPlanTermin(
        vorlage_id=None,
        jahr=(zieldatum or date.today()).year if zieldatum else date.today().year,
        titel=titel,
        zieldatum=zieldatum,
        ist_platzhalter=ist_platzhalter,
        status=status,
        dienstbuch_id=dienstbuch_id,
    )
    db.add(termin)
    await db.commit()
    await db.refresh(termin)
    return termin


async def test_faelliger_bestaetigter_termin_wird_verknuepft(db):
    termin = await _termin(db, zieldatum=date.today() - timedelta(days=1), titel="UVV-Unterweisung")

    await _dienstbuch_plan_verknuepfung_job()

    await db.refresh(termin)
    assert termin.dienstbuch_id is not None
    assert termin.dienstbuch_erzeugt_am is not None

    dienstbuch = (
        await db.execute(select(Dienstbuch).where(Dienstbuch.id == termin.dienstbuch_id))
    ).scalar_one()
    assert dienstbuch.titel == "UVV-Unterweisung"

    ereignisse = (
        await db.execute(
            select(DienstbuchPlanTerminEreignis).where(DienstbuchPlanTerminEreignis.termin_id == termin.id)
        )
    ).scalars().all()
    assert any(e.typ == "dienstbuch_verknuepft" for e in ereignisse)
    assert all(e.akteur_name is None for e in ereignisse if e.typ == "dienstbuch_verknuepft")


async def test_verknuepfung_ist_idempotent(db):
    termin = await _termin(db, zieldatum=date.today())

    await _dienstbuch_plan_verknuepfung_job()
    await db.refresh(termin)
    erste_dienstbuch_id = termin.dienstbuch_id
    assert erste_dienstbuch_id is not None

    await _dienstbuch_plan_verknuepfung_job()
    await db.refresh(termin)
    assert termin.dienstbuch_id == erste_dienstbuch_id

    anzahl = (await db.execute(select(Dienstbuch))).scalars().all()
    assert len(anzahl) == 1


async def test_entwurf_termin_wird_nicht_verknuepft(db):
    termin = await _termin(db, status="entwurf", zieldatum=date.today())
    await _dienstbuch_plan_verknuepfung_job()
    await db.refresh(termin)
    assert termin.dienstbuch_id is None


async def test_platzhalter_wird_nicht_verknuepft(db):
    termin = await _termin(db, ist_platzhalter=True, zieldatum=None)
    await _dienstbuch_plan_verknuepfung_job()
    await db.refresh(termin)
    assert termin.dienstbuch_id is None


async def test_zukuenftiger_termin_wird_noch_nicht_verknuepft(db):
    termin = await _termin(db, zieldatum=date.today() + timedelta(days=5))
    await _dienstbuch_plan_verknuepfung_job()
    await db.refresh(termin)
    assert termin.dienstbuch_id is None
