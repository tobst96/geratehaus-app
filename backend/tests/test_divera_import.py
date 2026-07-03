"""Tests für divera_service: Alarm→Einsatz-Anlage (importiere_alarm) und
Polling-Synchronisation (synchronisiere). Ergänzt die Client-Tests
(test_divera_client) um den Import-/Upsert-Pfad."""

from unittest.mock import AsyncMock, patch

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.einsatz import Einsatz
from app.services import divera_service
from app.services.config_service import config_service


async def _divera_aktivieren(db: AsyncSession) -> None:
    await config_service.set(db, "modul_divera_aktiv", True)
    await config_service.set(db, "divera_aktiv", True)
    await config_service.set(db, "divera_api_key", "test-key")


@pytest.mark.asyncio
async def test_importiere_alarm_legt_einsatz_an(db: AsyncSession):
    einsatz = await divera_service.importiere_alarm(
        db, {"id": 99, "title": "B2 - Zimmerbrand", "date": 1719439900}
    )

    assert einsatz is not None
    assert einsatz.titel == "B2 - Zimmerbrand"
    assert einsatz.quelle == "divera"
    assert einsatz.divera_id == "99"
    assert einsatz.status == "offen"


@pytest.mark.asyncio
async def test_importiere_alarm_uebernimmt_adresse_und_meldung(db: AsyncSession):
    einsatz = await divera_service.importiere_alarm(
        db,
        {
            "id": 700,
            "title": "H2",
            "text": "PKW im Graben, 2 eingeschlossen",
            "address": "Westerstede, Kanalstraße",
            "date": 1719439900,
        },
    )

    assert einsatz is not None
    assert einsatz.titel == "H2"
    assert einsatz.adresse == "Westerstede, Kanalstraße"
    assert einsatz.meldung == "PKW im Graben, 2 eingeschlossen"


@pytest.mark.asyncio
async def test_importiere_alarm_ohne_zusatzinfos_laesst_felder_leer(db: AsyncSession):
    # titel == text -> keine redundante Meldung; keine Adresse vorhanden
    einsatz = await divera_service.importiere_alarm(
        db, {"id": 701, "title": "Probealarm", "text": "Probealarm", "date": 1719439900}
    )
    assert einsatz is not None
    assert einsatz.adresse is None
    assert einsatz.meldung is None


@pytest.mark.asyncio
async def test_importiere_geschlossenen_alarm_als_abgeschlossen(db: AsyncSession):
    """Ein bereits in Divera geschlossener (nachgeholter) Alarm wird als
    abgeschlossen angelegt und löst KEINE „neuer Einsatz"-Benachrichtigung aus."""
    with patch.object(divera_service.notifier_service, "benachrichtige", new=AsyncMock()) as mock_notify:
        einsatz = await divera_service.importiere_alarm(
            db, {"id": 500, "title": "H1 - alt", "date": 1719439900, "closed": True}
        )

    assert einsatz is not None
    assert einsatz.status == "abgeschlossen"
    mock_notify.assert_not_called()


@pytest.mark.asyncio
async def test_importiere_offenen_alarm_benachrichtigt(db: AsyncSession):
    with patch.object(divera_service.notifier_service, "benachrichtige", new=AsyncMock()) as mock_notify:
        einsatz = await divera_service.importiere_alarm(
            db, {"id": 501, "title": "H1 - aktiv", "date": 1719439900, "closed": False}
        )

    assert einsatz is not None
    assert einsatz.status == "offen"
    mock_notify.assert_called_once()


@pytest.mark.asyncio
async def test_importiere_alarm_dedupliziert_ueber_divera_id(db: AsyncSession):
    roh = {"id": 99, "title": "B2 - Zimmerbrand", "date": 1719439900}
    erster = await divera_service.importiere_alarm(db, roh)
    zweiter = await divera_service.importiere_alarm(db, roh)

    assert erster is not None
    # Zweiter Import derselben divera_id legt keinen weiteren Einsatz an.
    assert zweiter is None
    anzahl = len((await db.execute(select(Einsatz).where(Einsatz.divera_id == "99"))).scalars().all())
    assert anzahl == 1


@pytest.mark.asyncio
async def test_importiere_alarm_unvollstaendig_ignoriert(db: AsyncSession):
    # Ohne id/titel lässt sich kein Einsatz normalisieren.
    assert await divera_service.importiere_alarm(db, {"foo": "bar"}) is None


@pytest.mark.asyncio
async def test_synchronisiere_importiert_nur_neue(db: AsyncSession):
    await _divera_aktivieren(db)
    alarme = [
        {"id": 1, "title": "Alarm 1", "date": 1719439900},
        {"id": 2, "title": "Alarm 2", "date": 1719439950},
    ]

    # Erster Lauf: beide neu. Zweiter Lauf mit denselben Alarmen: keine neuen.
    with patch(
        "app.services.divera_client.hole_alarme",
        new=AsyncMock(return_value=(alarme, 5000)),
    ):
        anzahl_erster = await divera_service.synchronisiere(db)
        anzahl_zweiter = await divera_service.synchronisiere(db)

    assert anzahl_erster == 2
    assert anzahl_zweiter == 0


@pytest.mark.asyncio
async def test_synchronisiere_deaktiviert_macht_nichts(db: AsyncSession):
    await config_service.set(db, "divera_aktiv", False)
    with patch("app.services.divera_client.hole_alarme", new=AsyncMock()) as mock_fn:
        anzahl = await divera_service.synchronisiere(db)

    assert anzahl == 0
    mock_fn.assert_not_called()
