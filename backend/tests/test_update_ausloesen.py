"""Tests für update_service.update_ausloesen: schreibt die Update-Markerdatei nur
bei tatsächlich verfügbarem Update (das eigentliche Update übernimmt das
host-seitige scripts/updater.sh)."""

from unittest.mock import AsyncMock, patch

import pytest

from app.services import update_service


def _status(update_verfuegbar: bool, fehler: str | None = None, version: str | None = "1.2.0") -> dict:
    return {
        "kanal": "stable",
        "installierte_version": "1.1.0",
        "verfuegbare_version": version,
        "veroeffentlicht_am": None,
        "release_url": None,
        "update_verfuegbar": update_verfuegbar,
        "fehler": fehler,
    }


@pytest.mark.asyncio
async def test_ausloesen_schreibt_marker_bei_verfuegbarem_update(db, tmp_path, monkeypatch):
    monkeypatch.setattr(update_service.settings, "update_signal_dir", str(tmp_path))
    with patch.object(update_service, "update_status", new=AsyncMock(return_value=_status(True))):
        ergebnis = await update_service.update_ausloesen(db)

    assert ergebnis["angefordert"] is True
    marker = tmp_path / update_service.UPDATE_MARKER_NAME
    assert marker.exists()
    assert "1.2.0" in marker.read_text()


@pytest.mark.asyncio
async def test_ausloesen_kein_marker_wenn_bereits_aktuell(db, tmp_path, monkeypatch):
    monkeypatch.setattr(update_service.settings, "update_signal_dir", str(tmp_path))
    with patch.object(update_service, "update_status", new=AsyncMock(return_value=_status(False))):
        ergebnis = await update_service.update_ausloesen(db)

    assert ergebnis["angefordert"] is False
    assert not (tmp_path / update_service.UPDATE_MARKER_NAME).exists()


@pytest.mark.asyncio
async def test_ausloesen_kein_marker_bei_github_fehler(db, tmp_path, monkeypatch):
    monkeypatch.setattr(update_service.settings, "update_signal_dir", str(tmp_path))
    with patch.object(
        update_service, "update_status", new=AsyncMock(return_value=_status(False, fehler="GitHub nicht erreichbar"))
    ):
        ergebnis = await update_service.update_ausloesen(db)

    assert ergebnis["angefordert"] is False
    assert "GitHub nicht erreichbar" in ergebnis["meldung"]
    assert not (tmp_path / update_service.UPDATE_MARKER_NAME).exists()


async def test_ausloesen_route_ohne_login_verweigert(client):
    response = await client.post("/api/v1/gruppenfuehrer/update/ausloesen")
    assert response.status_code == 401
