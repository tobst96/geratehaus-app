"""Sentry `_before_send`-Filter: erwartetes Rauschen (CancelledError,
behandelte Backup-Fehler) erzeugt kein Issue, echte Fehler bleiben erhalten."""

import asyncio

from app.core.sentry_setup import _before_send


def test_cancelled_error_ueber_exc_info_wird_verworfen():
    hint = {"exc_info": (asyncio.CancelledError, asyncio.CancelledError(), None)}
    assert _before_send({}, hint) is None


def test_cancelled_error_ueber_serialisierten_typ_wird_verworfen():
    # So liefert Sentry das Event bei einem via Logging erfassten CancelledError.
    event = {"exception": {"values": [{"type": "CancelledError", "value": "x"}]}}
    assert _before_send(event, {}) is None


def test_behandelter_backup_fehler_wird_verworfen():
    event = {"logentry": {"message": "backup_fehlgeschlagen ziel=webdav"}}
    assert _before_send(event, {}) is None


def test_unvollstaendige_divera_person_wird_verworfen():
    # Divera-Personal-Sync überspringt Datensätze ohne id/Name bewusst und loggt
    # eine Warnung – daraus soll kein eigenes Sentry-Issue je Person entstehen.
    event = {
        "logentry": {
            "message": (
                "{'roh': {'firstname': 'Max', 'lastname': 'Muster'}, "
                "'event': 'divera_person_unvollstaendig', 'level': 'warning'}"
            )
        }
    }
    assert _before_send(event, {}) is None


def test_echter_fehler_bleibt_erhalten():
    hint = {"exc_info": (ValueError, ValueError("kaputt"), None)}
    event = {"exception": {"values": [{"type": "ValueError", "value": "kaputt"}]}}
    assert _before_send(event, hint) is event


def test_normales_log_event_bleibt_erhalten():
    event = {"logentry": {"message": "irgendein_info_log"}}
    assert _before_send(event, {}) is event
