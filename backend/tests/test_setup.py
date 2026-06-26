"""Reproduziert den Bug, bei dem POST /setup mit dem tatsächlichen
Frontend-Payload (ohne geofence_*-Felder, siehe frontend/src/api/setup.ts)
mit 422 fehlschlug, weil das Backend-Schema diese Felder noch als Pflicht
verlangte – Überbleibsel aus der geofence- statt barcode-basierten
Kiosk-Identifikation. Siehe TODO.md / git log für den Kontext."""


async def _minimaler_frontend_payload() -> dict:
    """Exakt die Felder, die SetupWizard.tsx tatsächlich sendet."""
    return {
        "organisation_name": "Freiwillige Feuerwehr Test",
        "farbe_primaer": "#FFA633",
        "farbe_akzent": "#1A1A1A",
        "admin_passwort": "geheim123",
        "fehlerberichte_aktiv": False,
    }


async def test_setup_status_ist_anfangs_nicht_eingerichtet(client):
    response = await client.get("/api/v1/setup/status")
    assert response.status_code == 200
    assert response.json()["ist_eingerichtet"] is False


async def test_setup_mit_frontend_payload_erfolgreich(client):
    response = await client.post("/api/v1/setup", json=await _minimaler_frontend_payload())
    assert response.status_code == 204

    status = await client.get("/api/v1/setup/status")
    assert status.json()["ist_eingerichtet"] is True


async def test_setup_login_funktioniert_nach_einrichtung(client):
    await client.post("/api/v1/setup", json=await _minimaler_frontend_payload())
    login = await client.post(
        "/api/v1/auth/moderator/login", data={"username": "admin", "password": "geheim123"}
    )
    assert login.status_code == 200


async def test_setup_kann_nicht_zweimal_ausgefuehrt_werden(client):
    payload = await _minimaler_frontend_payload()
    erste = await client.post("/api/v1/setup", json=payload)
    assert erste.status_code == 204

    zweite = await client.post("/api/v1/setup", json=payload)
    assert zweite.status_code == 409
