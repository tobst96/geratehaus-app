"""Service-Tests für den Dienstbuch-Planer (Backlog: Modul Dienstbuch Planer,
Phase 1) - Vorlagen/Termine/Kategorien-CRUD, Idempotenz, Audit-Protokoll."""

from datetime import date, datetime, timedelta, timezone

import pytest

from app.models.dienstbuch import Dienstbuch
from app.services import dienstbuch_planer_service as service
from app.services.dienstbuch_plan_engine import VorlageValidierungsFehler
from app.schemas.dienstbuch_planer import (
    PlanerKategorieAnlegen,
    PlanPlatzhalterAnlegen,
    PlanTerminAktualisieren,
    PlanVorlageAnlegen,
)


async def _uvv_vorlage(db, **overrides):
    werte = {
        "titel": "Unterweisung UVV",
        "wiederholungstyp": "jaehrlich",
        "wochentag": 2,
        "kalenderwoche": 5,
        "kw_paritaet": "ungerade",
        "startdatum": date(2020, 1, 1),
    }
    werte.update(overrides)
    return await service.vorlage_anlegen(db, PlanVorlageAnlegen(**werte))


async def test_vorlage_anlegen_mit_widerspruechlicher_regel_wirft(db):
    daten = PlanVorlageAnlegen(
        titel="Fehlerhaft",
        wiederholungstyp="jaehrlich",
        wochentag=2,
        kalenderwoche=5,
        kw_paritaet="gerade",  # KW5 ist ungerade - widersprüchlich
        startdatum=date(2020, 1, 1),
    )
    with pytest.raises(VorlageValidierungsFehler):
        await service.vorlage_anlegen(db, daten)


async def test_instanzen_fuer_jahr_sicherstellen_ist_idempotent(db):
    vorlage = await _uvv_vorlage(db)

    erste_runde = await service.instanzen_fuer_jahr_sicherstellen(db, 2026)
    assert len(erste_runde) == 1
    assert erste_runde[0].zieldatum == date(2026, 1, 28)
    assert erste_runde[0].status == "entwurf"
    assert [k.name for k in erste_runde[0].kategorien] == []

    zweite_runde = await service.instanzen_fuer_jahr_sicherstellen(db, 2026)
    assert zweite_runde == []  # keine Duplikate

    alle = await service.liste_termine(db, 2026)
    assert len(alle) == 1
    assert alle[0].vorlage_id == vorlage.id


async def test_instanzen_uebernehmen_kategorien_der_vorlage(db):
    kategorie = await service.kategorie_anlegen(
        db, PlanerKategorieAnlegen(name="Ausbildung", farbe="#FF0000")
    )
    vorlage = await _uvv_vorlage(db, kategorie_ids=[kategorie.id])
    assert [k.id for k in vorlage.kategorien] == [kategorie.id]

    termine = await service.instanzen_fuer_jahr_sicherstellen(db, 2026)
    assert [k.id for k in termine[0].kategorien] == [kategorie.id]


async def test_termin_bestaetigen_protokolliert_akteur(db):
    await _uvv_vorlage(db)
    termine = await service.instanzen_fuer_jahr_sicherstellen(db, 2026)
    termin = termine[0]

    aktualisiert = await service.termin_bestaetigen(db, termin, "Max Admin")
    assert aktualisiert.status == "bestaetigt"

    ereignisse = await service.termin_ereignisse(db, termin.id)
    bestaetigt = [e for e in ereignisse if e.typ == "bestaetigt"]
    assert len(bestaetigt) == 1
    assert bestaetigt[0].akteur_name == "Max Admin"


async def test_termin_aktualisieren_erzeugt_lesbaren_diff(db):
    await _uvv_vorlage(db)
    termin = (await service.instanzen_fuer_jahr_sicherstellen(db, 2026))[0]

    await service.termin_aktualisieren(
        db, termin, PlanTerminAktualisieren(titel="Unterweisung UVV (verschoben)"), "Chefin"
    )

    ereignisse = await service.termin_ereignisse(db, termin.id)
    geaendert = [e for e in ereignisse if e.typ == "geaendert"]
    assert len(geaendert) == 1
    assert "Unterweisung UVV" in geaendert[0].beschreibung
    assert "verschoben" in geaendert[0].beschreibung
    assert geaendert[0].akteur_name == "Chefin"


async def test_termin_aktualisieren_ohne_aenderung_protokolliert_nichts(db):
    await _uvv_vorlage(db)
    termin = (await service.instanzen_fuer_jahr_sicherstellen(db, 2026))[0]
    anzahl_vorher = len(await service.termin_ereignisse(db, termin.id))

    await service.termin_aktualisieren(db, termin, PlanTerminAktualisieren(titel=termin.titel), "Chefin")

    anzahl_nachher = len(await service.termin_ereignisse(db, termin.id))
    assert anzahl_nachher == anzahl_vorher


async def test_entwurf_zuruecksetzen_blockiert_wenn_bereits_verknuepft(db):
    await _uvv_vorlage(db)
    termin = (await service.instanzen_fuer_jahr_sicherstellen(db, 2026))[0]
    await service.termin_bestaetigen(db, termin, "Chefin")
    dienstbuch = Dienstbuch(titel=termin.titel, eroeffnet_am=datetime.now(timezone.utc))
    db.add(dienstbuch)
    await db.flush()
    termin.dienstbuch_id = dienstbuch.id
    await db.commit()

    with pytest.raises(ValueError):
        await service.termin_zu_entwurf_zuruecksetzen(db, termin, "Chefin")


async def test_platzhalter_anlegen_ohne_zieldatum(db):
    termin = await service.platzhalter_anlegen(
        db, PlanPlatzhalterAnlegen(titel="Noch offen: Sommerfest", jahr=2026), "Chefin"
    )
    assert termin.ist_platzhalter is True
    assert termin.zieldatum is None
    assert termin.status == "entwurf"


async def test_ueberfaellige_vorlagen(db):
    vorlage = await _uvv_vorlage(
        db,
        wiederholungstyp="alle_x_monate",
        intervall=6,
        wochentag=None,
        kalenderwoche=None,
        kw_paritaet=None,
        mindest_intervall_aktiv=True,
        mindest_intervall_tage=180,
        titel="Ortskommandositzung",
        startdatum=date.today() - timedelta(days=400),
    )
    heute = date.today()

    # Noch nie bestätigt -> seit dem Startdatum überfällig.
    treffer = await service.ueberfaellige_vorlagen(db, heute)
    assert any(v.id == vorlage.id for v, _letztes, _tage in treffer)

    # Kürzlich bestätigter Termin -> nicht mehr überfällig.
    termin = await service.platzhalter_anlegen(
        db, PlanPlatzhalterAnlegen(titel="Sitzung", jahr=heute.year), None
    )
    termin.vorlage_id = vorlage.id
    termin.zieldatum = heute - timedelta(days=10)
    termin.ist_platzhalter = False
    await service.termin_bestaetigen(db, termin, "Chefin")

    treffer = await service.ueberfaellige_vorlagen(db, heute)
    assert not any(v.id == vorlage.id for v, _letztes, _tage in treffer)


async def test_vorjahres_einzeltermine_wandern_als_entwurf_ins_folgejahr(db):
    """Nutzerwunsch 25.08.2026: ALLE Termine (nicht nur Vorlagen-Instanzen)
    kommen als Entwurf ins neue Jahr - gleiche KW + gleicher Wochentag.
    Konkretes Nutzer-Beispiel: 26.08.2026 (Mittwoch, KW 35)."""
    from datetime import time as time_
    from app.schemas.dienstbuch_planer import PlanTerminAnlegen

    quelle = await service.termin_anlegen(
        db,
        PlanTerminAnlegen(
            titel="Sommerübung",
            zieldatum=date(2026, 8, 26),
            uhrzeit=time_(19, 0),
            endzeit=time_(21, 0),
        ),
        "Tester",
    )
    assert quelle.zieldatum.isocalendar()[1] == 35 and quelle.zieldatum.weekday() == 2

    neue = await service.instanzen_fuer_jahr_sicherstellen(db, 2027)
    uebernommen = next(t for t in neue if t.titel == "Sommerübung")
    assert uebernommen.status == "entwurf"
    assert uebernommen.zieldatum.isocalendar()[1] == 35
    assert uebernommen.zieldatum.weekday() == 2  # Mittwoch
    assert uebernommen.zieldatum == date(2027, 9, 1)
    assert uebernommen.uhrzeit == time_(19, 0)
    assert uebernommen.endzeit == time_(21, 0)

    # Idempotent: zweiter Lauf erzeugt keine Dublette.
    nochmal = await service.instanzen_fuer_jahr_sicherstellen(db, 2027)
    assert not any(t.titel == "Sommerübung" for t in nochmal)


async def test_vorlagen_instanzen_erben_uhrzeit(db):
    from datetime import time as time_

    await _uvv_vorlage(db, uhrzeit=time_(19, 30), endzeit=time_(21, 0))
    termine = await service.instanzen_fuer_jahr_sicherstellen(db, 2026)
    assert termine[0].uhrzeit == time_(19, 30)
    assert termine[0].endzeit == time_(21, 0)


async def test_vorlage_deaktivieren_erzeugt_keine_neuen_instanzen(db):
    vorlage = await _uvv_vorlage(db)
    await service.vorlage_deaktivieren(db, vorlage)

    termine = await service.instanzen_fuer_jahr_sicherstellen(db, 2030)
    assert termine == []
