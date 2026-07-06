"""CSP-Verstoß-Report-Endpunkt (Report-Only-Auswertung): nimmt Browser-Meldungen
entgegen, ist öffentlich + robust gegen Müll."""

import pytest


@pytest.mark.asyncio
async def test_csp_report_nimmt_bericht_an(client):
    bericht = {
        "csp-report": {
            "violated-directive": "img-src",
            "blocked-uri": "https://fremd.example.org/logo.png",
        }
    }
    r = await client.post("/api/v1/csp-report", json=bericht)
    assert r.status_code == 204


@pytest.mark.asyncio
async def test_csp_report_robust_gegen_muell(client):
    r = await client.post("/api/v1/csp-report", content=b"kein json", headers={"content-type": "text/plain"})
    assert r.status_code == 204
