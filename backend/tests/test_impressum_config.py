"""Impressum-Felder (§ 5 DDG) werden über /oeffentliche-konfiguration
ausgeliefert, damit die Impressum-Seite ohne Login erreichbar ist."""

import pytest

from app.services.config_service import config_service


@pytest.mark.asyncio
async def test_impressum_felder_default_leer(client):
    r = await client.get("/api/v1/oeffentliche-konfiguration")
    assert r.status_code == 200
    daten = r.json()
    assert daten["impressum_verantwortliche_person"] == ""
    assert daten["impressum_anschrift"] == ""
    assert daten["impressum_email"] == ""
    assert daten["impressum_telefon"] == ""
    assert daten["impressum_zusatz"] == ""


@pytest.mark.asyncio
async def test_impressum_felder_werden_ausgeliefert(client, db):
    await config_service.set_many(
        db,
        {
            "impressum_verantwortliche_person": "Max Mustermann",
            "impressum_anschrift": "Musterstraße 1\n12345 Musterstadt",
            "impressum_email": "vorstand@feuerwehr-musterstadt.de",
            "impressum_telefon": "+49 1234 56789",
            "impressum_zusatz": "Eingetragen im Vereinsregister XY",
        },
    )
    r = await client.get("/api/v1/oeffentliche-konfiguration")
    daten = r.json()
    assert daten["impressum_verantwortliche_person"] == "Max Mustermann"
    assert daten["impressum_anschrift"] == "Musterstraße 1\n12345 Musterstadt"
    assert daten["impressum_email"] == "vorstand@feuerwehr-musterstadt.de"
    assert daten["impressum_telefon"] == "+49 1234 56789"
    assert daten["impressum_zusatz"] == "Eingetragen im Vereinsregister XY"
