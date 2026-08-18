"""System-Statuspanel (Admin-Observability): Readiness-Endpunkt mit DB-Check
und der Admin-only Statusendpunkt (DB/SMTP/MinIO/Divera/Scheduler)."""

import pytest

from app.core.security import hash_secret
from app.models.person import Person
from app.services.config_service import config_service


async def _token(client, db, username="admin", rolle="admin"):
    db.add(Person(name=username, email=username, passwort_hash=hash_secret("geheim123"), gruppenfuehrer_rolle=rolle))
    await db.commit()
    r = await client.post(
        "/api/v1/auth/gruppenfuehrer/login", data={"username": username, "password": "geheim123"}
    )
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.mark.asyncio
async def test_readiness_ok(client):
    r = await client.get("/api/v1/ready")
    assert r.status_code == 200
    assert r.json()["status"] == "ready"


@pytest.mark.asyncio
async def test_systemstatus_admin(client, db):
    await config_service.set(db, "notifier_email_smtp_host", "mail.example.org")
    await config_service.set(db, "divera_api_key", "geheim")
    h = await _token(client, db)

    r = await client.get("/api/v1/gruppenfuehrer/meta/systemstatus", headers=h)
    assert r.status_code == 200
    d = r.json()
    assert d["datenbank"]["ok"] is True
    assert d["smtp"]["konfiguriert"] is True
    assert d["smtp"]["host"] == "mail.example.org"
    assert d["divera"]["api_key_gesetzt"] is True
    assert d["minio"]["aktiv"] is False
    # Scheduler-Struktur vorhanden (im Test läuft er nicht, aber Felder existieren)
    assert "laeuft" in d["scheduler"]
    assert isinstance(d["scheduler"]["jobs"], list)
    assert d["version"]


@pytest.mark.asyncio
async def test_systemstatus_nur_admin(client, db):
    h = await _token(client, db, "gf", "gruppenfuehrer")
    r = await client.get("/api/v1/gruppenfuehrer/meta/systemstatus", headers=h)
    assert r.status_code == 403
