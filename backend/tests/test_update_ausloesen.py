"""Tests für update_service.update_ausloesen: erstellt vor dem Update immer ein
Backup und schreibt die Update-Markerdatei (mit dem exakten Ziel-Git-Tag) nur
bei tatsächlich installierbarer Version (das eigentliche Update übernimmt das
host-seitige scripts/updater.sh)."""

from unittest.mock import AsyncMock, patch

import pytest

from app.services import backup_service, update_service


def _status(
    installierbar: bool,
    update_verfuegbar: bool | None = None,
    fehler: str | None = None,
    version: str | None = "1.2.0",
    ziel_tag: str | None = "v1.2.0",
) -> dict:
    return {
        "kanal": "stable",
        "installierte_version": "1.1.0",
        "verfuegbare_version": version,
        "ziel_tag": ziel_tag,
        "veroeffentlicht_am": None,
        "release_url": None,
        "update_verfuegbar": update_verfuegbar if update_verfuegbar is not None else installierbar,
        "installierbar": installierbar,
        "fehler": fehler,
    }


def _backup_mock():
    return patch.object(backup_service, "erstelle_backup", new=AsyncMock(return_value=None))


@pytest.mark.asyncio
async def test_ausloesen_erstellt_backup_und_schreibt_marker_mit_ziel_tag(db, tmp_path, monkeypatch):
    monkeypatch.setattr(update_service.settings, "update_signal_dir", str(tmp_path))
    with patch.object(update_service, "update_status", new=AsyncMock(return_value=_status(True))), _backup_mock() as backup_mock:
        ergebnis = await update_service.update_ausloesen(db)

    backup_mock.assert_awaited_once()
    assert backup_mock.await_args.kwargs.get("ausloeser") == "vor_update"
    assert ergebnis["angefordert"] is True
    marker = tmp_path / update_service.UPDATE_MARKER_NAME
    assert marker.exists()
    # Marker enthält den Git-TAG (mit "v"-Präfix), nicht nur die nackte Versionsnummer.
    assert marker.read_text().splitlines()[0] == "v1.2.0"


@pytest.mark.asyncio
async def test_ausloesen_installierbar_auch_bei_aelterer_version_ohne_update_verfuegbar(db, tmp_path, monkeypatch):
    # Kanalwechsel auf eine ältere Version: installierbar=True, aber update_verfuegbar=False.
    monkeypatch.setattr(update_service.settings, "update_signal_dir", str(tmp_path))
    status = _status(installierbar=True, update_verfuegbar=False, version="1.0.0", ziel_tag="v1.0.0")
    with patch.object(update_service, "update_status", new=AsyncMock(return_value=status)), _backup_mock():
        ergebnis = await update_service.update_ausloesen(db)

    assert ergebnis["angefordert"] is True
    marker = tmp_path / update_service.UPDATE_MARKER_NAME
    assert marker.read_text().splitlines()[0] == "v1.0.0"


@pytest.mark.asyncio
async def test_ausloesen_kein_marker_wenn_bereits_aktuell(db, tmp_path, monkeypatch):
    monkeypatch.setattr(update_service.settings, "update_signal_dir", str(tmp_path))
    with patch.object(update_service, "update_status", new=AsyncMock(return_value=_status(False))), _backup_mock() as backup_mock:
        ergebnis = await update_service.update_ausloesen(db)

    assert ergebnis["angefordert"] is False
    assert not (tmp_path / update_service.UPDATE_MARKER_NAME).exists()
    # Kein Update nötig → auch kein unnötiges Backup.
    backup_mock.assert_not_awaited()


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


@pytest.mark.asyncio
async def test_ausloesen_kein_marker_wenn_backup_fehlschlaegt(db, tmp_path, monkeypatch):
    """Regression: Update darf niemals ohne (erfolgreiches) Backup angestoßen werden."""
    monkeypatch.setattr(update_service.settings, "update_signal_dir", str(tmp_path))
    with (
        patch.object(update_service, "update_status", new=AsyncMock(return_value=_status(True))),
        patch.object(
            backup_service,
            "erstelle_backup",
            new=AsyncMock(side_effect=backup_service.BackupFehler("Kein Backup-Ziel aktiv.")),
        ),
    ):
        ergebnis = await update_service.update_ausloesen(db)

    assert ergebnis["angefordert"] is False
    assert "Backup" in ergebnis["meldung"]
    assert not (tmp_path / update_service.UPDATE_MARKER_NAME).exists()


async def test_ausloesen_route_ohne_login_verweigert(client):
    response = await client.post("/api/v1/gruppenfuehrer/update/ausloesen")
    assert response.status_code == 401
