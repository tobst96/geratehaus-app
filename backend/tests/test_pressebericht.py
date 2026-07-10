"""Tests für das Modul Pressebericht: Inhalts-Kontext, Versand (Mail/Timeline/
Marker), zeitgesteuerte Fälligkeit und der Hook beim Einsatz-Abschluss."""

import itertools
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, patch

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.einsatz import Einsatz, EinsatzPerson
from app.models.einsatz_ereignis import EinsatzEreignis
from app.models.fahrzeug import Fahrzeug
from app.models.person import Person
from app.schemas.einsatz import EinsatzAnlegen
from app.services import einsatz_service, pressebericht_service
from app.services.config_service import config_service


_zaehler = itertools.count(1)


async def _modul_aktivieren(db: AsyncSession) -> None:
    await config_service.set(db, "modul_pressebericht_aktiv", True)


async def _einsatz_mit_teilnehmern(
    db: AsyncSession, *, mit_fahrzeug: bool = True
) -> tuple[Einsatz, list[str]]:
    """Legt einen Einsatz mit zwei Teilnehmern (eindeutige Namen wegen
    Person.name-Unique) an. Gibt (Einsatz, [Namen]) zurück."""
    n = next(_zaehler)
    einsatz = await einsatz_service.einsatz_anlegen(
        db,
        EinsatzAnlegen(titel="Zimmerbrand", zeitpunkt=datetime(2026, 7, 1, 12, 0, tzinfo=timezone.utc)),
    )
    einsatz_id = einsatz.id
    fahrzeug = None
    if mit_fahrzeug:
        fahrzeug = Fahrzeug(name="LF 20")
        db.add(fahrzeug)
        await db.commit()
        await db.refresh(fahrzeug)
    namen = [f"Anna Admin {n}", f"Bernd Brand {n}"]
    for name in namen:
        person = Person(name=name)
        db.add(person)
        await db.commit()
        await db.refresh(person)
        db.add(
            EinsatzPerson(
                einsatz_id=einsatz_id,
                person_id=person.id,
                fahrzeug_id=fahrzeug.id if fahrzeug else None,
            )
        )
    await db.commit()
    # Identity-Map leeren: einsatz_anlegen hat den Einsatz mit (damals leerer)
    # teilnahmen-Collection geladen; ohne Expire bliebe sie in dieser Session stale.
    db.expire_all()
    geladen = await einsatz_service.get_einsatz(db, einsatz_id)
    assert geladen is not None
    return geladen, namen


@pytest.mark.asyncio
async def test_modul_inaktiv_kein_versand(db: AsyncSession):
    einsatz, _ = await _einsatz_mit_teilnehmern(db)
    assert await pressebericht_service.pressebericht_versenden(db, einsatz) is False
    frisch = await einsatz_service.get_einsatz(db, einsatz.id)
    assert frisch.pressebericht_gesendet_am is None


@pytest.mark.asyncio
async def test_kontext_enthaelt_nur_konfigurierte_bloecke(db: AsyncSession):
    await _modul_aktivieren(db)
    await config_service.set(db, "pressebericht_teilnehmer_anzahl", True)
    await config_service.set(db, "pressebericht_teilnehmer_namen", True)
    await config_service.set(db, "pressebericht_fahrzeuge", True)
    einsatz, namen = await _einsatz_mit_teilnehmern(db)

    kontext = await pressebericht_service._kontext(db, einsatz)

    assert kontext["teilnehmer_anzahl"] == 2
    assert sorted(kontext["teilnehmer_namen"]) == sorted(namen)
    assert len(kontext["fahrzeuge"]) == 1
    assert kontext["fahrzeuge"][0]["name"] == "LF 20"
    assert sorted(kontext["fahrzeuge"][0]["besatzung"]) == sorted(namen)


@pytest.mark.asyncio
async def test_teilnehmer_namen_aus_wenn_deaktiviert(db: AsyncSession):
    await _modul_aktivieren(db)
    await config_service.set(db, "pressebericht_teilnehmer_anzahl", True)
    await config_service.set(db, "pressebericht_teilnehmer_namen", False)
    einsatz, _ = await _einsatz_mit_teilnehmern(db, mit_fahrzeug=False)

    kontext = await pressebericht_service._kontext(db, einsatz)

    assert kontext["teilnehmer_anzahl"] == 2
    assert kontext["teilnehmer_namen"] == []


@pytest.mark.asyncio
async def test_versand_happy_path(db: AsyncSession):
    await _modul_aktivieren(db)
    einsatz, _ = await _einsatz_mit_teilnehmern(db)

    with patch.object(
        pressebericht_service.pdf_service, "pressebericht_pdf", new=AsyncMock(return_value=b"PDF")
    ), patch.object(
        pressebericht_service.benachrichtigungskanal_service,
        "mail_empfaenger_fuer_ereignis",
        new=AsyncMock(return_value=["presse@example.org"]),
    ), patch.object(
        pressebericht_service.EmailNotifier, "pdf_versenden", new=AsyncMock()
    ) as mock_mail:
        ok = await pressebericht_service.pressebericht_versenden(db, einsatz)

    assert ok is True
    mock_mail.assert_awaited_once()
    frisch = await einsatz_service.get_einsatz(db, einsatz.id)
    assert frisch.pressebericht_gesendet_am is not None
    ereignisse = await einsatz_service.liste_ereignisse(db, einsatz.id)
    assert any(e.typ == "pressebericht" for e in ereignisse)


@pytest.mark.asyncio
async def test_faellige_einsaetze_uhrzeit(db: AsyncSession):
    await _modul_aktivieren(db)
    await config_service.set(db, "pressebericht_versand_modus", "uhrzeit")
    einsatz, _ = await _einsatz_mit_teilnehmern(db, mit_fahrzeug=False)
    einsatz.status = "abgeschlossen"
    await db.commit()

    with patch.object(pressebericht_service, "_uhrzeit_faellig", new=AsyncMock(return_value=True)):
        faellig = await pressebericht_service.faellige_einsaetze(db)
    assert einsatz.id in [e.id for e in faellig]

    # Außerhalb des Zeitfensters: nichts fällig.
    with patch.object(pressebericht_service, "_uhrzeit_faellig", new=AsyncMock(return_value=False)):
        assert await pressebericht_service.faellige_einsaetze(db) == []


@pytest.mark.asyncio
async def test_faellige_einsaetze_stunden(db: AsyncSession):
    await _modul_aktivieren(db)
    await config_service.set(db, "pressebericht_versand_modus", "stunden")
    await config_service.set(db, "pressebericht_versand_stunden", 2)
    einsatz, _ = await _einsatz_mit_teilnehmern(db, mit_fahrzeug=False)
    einsatz.status = "abgeschlossen"
    await db.commit()
    # „abgeschlossen"-Ereignis vor 3 Stunden → älter als die 2-Stunden-Grenze.
    db.add(
        EinsatzEreignis(
            einsatz_id=einsatz.id,
            typ="abgeschlossen",
            beschreibung="Einsatz abgeschlossen",
            zeitpunkt=datetime.now(timezone.utc) - timedelta(hours=3),
        )
    )
    await db.commit()

    faellig = await pressebericht_service.faellige_einsaetze(db)
    assert einsatz.id in [e.id for e in faellig]

    # Frisch abgeschlossener Einsatz (Ereignis jetzt) ist noch nicht fällig.
    einsatz2, _ = await _einsatz_mit_teilnehmern(db, mit_fahrzeug=False)
    einsatz2.status = "abgeschlossen"
    await db.commit()
    db.add(EinsatzEreignis(einsatz_id=einsatz2.id, typ="abgeschlossen", beschreibung="Einsatz abgeschlossen"))
    await db.commit()
    faellig_ids = [e.id for e in await pressebericht_service.faellige_einsaetze(db)]
    assert einsatz2.id not in faellig_ids


@pytest.mark.asyncio
async def test_abschluss_hook_versendet_bei_modus_schliessen(db: AsyncSession):
    await _modul_aktivieren(db)
    await config_service.set(db, "pressebericht_versand_modus", "schliessen")
    einsatz, _ = await _einsatz_mit_teilnehmern(db, mit_fahrzeug=False)

    with patch.object(
        pressebericht_service.pdf_service, "pressebericht_pdf", new=AsyncMock(return_value=b"PDF")
    ), patch.object(
        pressebericht_service.benachrichtigungskanal_service,
        "mail_empfaenger_fuer_ereignis",
        new=AsyncMock(return_value=[]),
    ):
        await einsatz_service.einsatz_abschliessen(db, einsatz)

    frisch = await einsatz_service.get_einsatz(db, einsatz.id)
    assert frisch.pressebericht_gesendet_am is not None
