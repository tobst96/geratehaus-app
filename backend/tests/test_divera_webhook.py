"""HTTP-Tests für den öffentlichen Divera-Webhook-Endpunkt.

Der Endpunkt ist öffentlich erreichbar (kein Login), daher sicherheitsrelevant:
Er muss bei falschem/leerem accesskey ablehnen und ratenbegrenzt sein. Der
accesskey wird zeitkonstant verglichen (`hmac.compare_digest`)."""

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rate_limit import _AUFRUFE
from app.services.config_service import config_service


async def _webhook_aktivieren(db: AsyncSession, api_key: str = "geheimer-divera-key") -> None:
    await config_service.set(db, "divera_aktiv", True)
    await config_service.set(db, "divera_modus", "webhook")
    await config_service.set(db, "divera_api_key", api_key)


async def test_webhook_falscher_accesskey_403(client, db: AsyncSession):
    await _webhook_aktivieren(db)
    resp = await client.post(
        "/api/v1/divera/webhook", params={"accesskey": "falsch"}, json={"alarm": {}}
    )
    assert resp.status_code == 403


async def test_webhook_leerer_key_konfiguriert_lehnt_ab(client, db: AsyncSession):
    # Kein API-Key hinterlegt: ein leerer accesskey darf NICHT durchrutschen.
    await _webhook_aktivieren(db, api_key="")
    resp = await client.post(
        "/api/v1/divera/webhook", params={"accesskey": ""}, json={"alarm": {}}
    )
    assert resp.status_code == 403


async def test_webhook_inaktiv_404(client, db: AsyncSession):
    await config_service.set(db, "divera_aktiv", False)
    resp = await client.post(
        "/api/v1/divera/webhook", params={"accesskey": "egal"}, json={"alarm": {}}
    )
    assert resp.status_code == 404


async def test_webhook_gueltiger_key_importiert(client, db: AsyncSession):
    await _webhook_aktivieren(db, api_key="geheim")
    alarm = {
        "id": 4242,
        "title": "Webhook-Testalarm",
        "text": "F2 Kleinbrand",
    }
    resp = await client.post(
        "/api/v1/divera/webhook", params={"accesskey": "geheim"}, json={"alarm": alarm}
    )
    assert resp.status_code == 204


async def test_webhook_accesskey_per_header(client, db: AsyncSession):
    # Secret im Header statt in der URL (bevorzugt) – muss ebenfalls akzeptiert werden.
    await _webhook_aktivieren(db, api_key="geheim")
    resp = await client.post(
        "/api/v1/divera/webhook",
        headers={"X-Divera-Accesskey": "geheim"},
        json={"alarm": {"id": 1, "title": "Header-Alarm"}},
    )
    assert resp.status_code == 204


async def test_webhook_falscher_header_403(client, db: AsyncSession):
    await _webhook_aktivieren(db, api_key="geheim")
    resp = await client.post(
        "/api/v1/divera/webhook",
        headers={"X-Divera-Accesskey": "falsch"},
        json={"alarm": {}},
    )
    assert resp.status_code == 403


async def test_webhook_ohne_key_403(client, db: AsyncSession):
    # Weder Header noch Query-Param → abgelehnt (kein Durchrutschen ohne Secret).
    await _webhook_aktivieren(db, api_key="geheim")
    resp = await client.post("/api/v1/divera/webhook", json={"alarm": {}})
    assert resp.status_code == 403


@pytest.mark.usefixtures("db")
async def test_webhook_rate_limit_greift(client, db: AsyncSession):
    await _webhook_aktivieren(db, api_key="geheim")
    _AUFRUFE.clear()
    # 60 Aufrufe/Minute sind erlaubt; der 61. muss mit 429 abgewiesen werden.
    letzte_status = None
    for _ in range(61):
        resp = await client.post(
            "/api/v1/divera/webhook", params={"accesskey": "falsch"}, json={"alarm": {}}
        )
        letzte_status = resp.status_code
    assert letzte_status == 429
