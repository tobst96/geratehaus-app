"""Tests für divera_client.hole_alarme: korrekter API-Endpunkt und Response-Parsing."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.divera_client import hole_alarme, BASIS_URL


def _mock_response(status_code: int, json_data: dict) -> MagicMock:
    response = MagicMock()
    response.json.return_value = json_data
    if status_code >= 400:
        from httpx import HTTPStatusError, Request, Response
        response.raise_for_status.side_effect = HTTPStatusError(
            message=f"{status_code}", request=MagicMock(), response=MagicMock()
        )
    else:
        response.raise_for_status.return_value = None
    return response


@pytest.mark.asyncio
async def test_endpunkt_ist_v2_pull_all():
    """hole_alarme muss /api/v2/pull/all aufrufen, nicht /api/alarms (war 404)."""
    erwartete_url = f"{BASIS_URL}/pull/all"
    antwort = {"success": True, "data": {"alarm": {"items": {}}}}

    mock_get = AsyncMock(return_value=_mock_response(200, antwort))
    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)
    mock_client.get = mock_get

    with patch("app.services.divera_client.httpx.AsyncClient", return_value=mock_client):
        await hole_alarme("test-key")

    mock_get.assert_called_once()
    aufgerufene_url = mock_get.call_args[0][0]
    assert aufgerufene_url == erwartete_url, f"Falscher Endpunkt: {aufgerufene_url}"


@pytest.mark.asyncio
async def test_parst_alarm_items_korrekt():
    """hole_alarme muss data.alarm.items auslesen und als Liste zurückgeben."""
    alarm = {"id": 42, "title": "B1 - Brand", "date": 1719439824}
    antwort = {"success": True, "data": {"alarm": {"items": {"42": alarm}}}}

    mock_get = AsyncMock(return_value=_mock_response(200, antwort))
    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)
    mock_client.get = mock_get

    with patch("app.services.divera_client.httpx.AsyncClient", return_value=mock_client):
        result = await hole_alarme("test-key")

    assert len(result) == 1
    assert result[0]["id"] == 42
    assert result[0]["title"] == "B1 - Brand"


@pytest.mark.asyncio
async def test_leere_items_ergibt_leere_liste():
    antwort = {"success": True, "data": {"alarm": {"items": {}}}}

    mock_get = AsyncMock(return_value=_mock_response(200, antwort))
    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)
    mock_client.get = mock_get

    with patch("app.services.divera_client.httpx.AsyncClient", return_value=mock_client):
        result = await hole_alarme("test-key")

    assert result == []


@pytest.mark.asyncio
async def test_http_fehler_gibt_leere_liste():
    """Bei HTTP-Fehler (z. B. 404) wird [] zurückgegeben, kein Exception."""
    mock_get = AsyncMock(return_value=_mock_response(404, {}))
    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)
    mock_client.get = mock_get

    with patch("app.services.divera_client.httpx.AsyncClient", return_value=mock_client):
        result = await hole_alarme("ungültiger-key")

    assert result == []
