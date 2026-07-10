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
async def test_importiere_alarm_uebernimmt_einsatznummer(db: AsyncSession):
    einsatz = await divera_service.importiere_alarm(
        db,
        {"id": 720, "title": "H2", "foreign_id": "2026-04711", "date": 1719439900},
    )
    assert einsatz is not None
    assert einsatz.einsatznummer == "2026-04711"

    # ohne Nummer bleibt das Feld leer
    ohne = await divera_service.importiere_alarm(
        db, {"id": 721, "title": "H1", "date": 1719439900}
    )
    assert ohne is not None
    assert ohne.einsatznummer is None


@pytest.mark.asyncio
async def test_importiere_alarm_nutzt_divera_zeitstempel(db: AsyncSession):
    """Der Einsatz-Zeitstempel entspricht der Divera-Alarmzeit, und die Änderung
    von der Systemzeit auf den Divera-Zeitstempel wird in der Timeline vermerkt."""
    from datetime import datetime, timezone

    from app.services import einsatz_service

    einsatz = await divera_service.importiere_alarm(
        db, {"id": 800, "title": "F2", "date": 1719439900}
    )
    assert einsatz is not None
    assert einsatz.zeitpunkt == datetime.fromtimestamp(1719439900, tz=timezone.utc)

    ereignisse = await einsatz_service.liste_ereignisse(db, einsatz.id)
    zeit_ereignis = [e for e in ereignisse if e.typ == "zeitstempel_divera"]
    assert len(zeit_ereignis) == 1
    assert "Divera-Zeitstempel" in zeit_ereignis[0].beschreibung


@pytest.mark.asyncio
async def test_importiere_alarm_ohne_divera_zeit_kein_zeitstempel_ereignis(db: AsyncSession):
    """Fehlt eine (valide) Divera-Zeit, wird die Systemzeit genutzt und KEIN
    Zeitstempel-Änderungs-Ereignis geschrieben."""
    from app.services import einsatz_service

    einsatz = await divera_service.importiere_alarm(db, {"id": 801, "title": "F1"})
    assert einsatz is not None
    ereignisse = await einsatz_service.liste_ereignisse(db, einsatz.id)
    assert not [e for e in ereignisse if e.typ == "zeitstempel_divera"]


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
    ), patch(
        "app.services.divera_client.hole_alarme_historie",
        new=AsyncMock(return_value=[]),
    ):
        anzahl_erster = await divera_service.synchronisiere(db)
        anzahl_zweiter = await divera_service.synchronisiere(db)

    assert anzahl_erster == 2
    assert anzahl_zweiter == 0


@pytest.mark.asyncio
async def test_synchronisiere_holt_geschlossene_aus_historie(db: AsyncSession):
    """Der Poll importiert zusätzlich zu /pull/all die Historie der letzten 30 min –
    so werden auch bereits geschlossene Alarme (Timing-Lücke) nachgeholt."""
    await _divera_aktivieren(db)
    # /pull/all liefert nichts (kein aktiver Alarm), Historie enthält einen
    # bereits geschlossenen Alarm.
    geschlossen = [{"id": 42, "title": "H1", "date": 1719440000}]
    with patch(
        "app.services.divera_client.hole_alarme", new=AsyncMock(return_value=([], None))
    ), patch(
        "app.services.divera_client.hole_alarme_historie",
        new=AsyncMock(return_value=geschlossen),
    ) as mock_hist:
        anzahl = await divera_service.synchronisiere(db)

    assert anzahl == 1
    mock_hist.assert_awaited_once()
    assert mock_hist.await_args.kwargs.get("minuten") == 30


@pytest.mark.asyncio
async def test_synchronisiere_deaktiviert_macht_nichts(db: AsyncSession):
    await config_service.set(db, "divera_aktiv", False)
    with patch("app.services.divera_client.hole_alarme", new=AsyncMock()) as mock_fn:
        anzahl = await divera_service.synchronisiere(db)

    assert anzahl == 0
    mock_fn.assert_not_called()
