from app.core.security import hash_secret
from app.models.moderator import Moderator


async def _admin_token(client, db):
    moderator = Moderator(username="admin", passwort_hash=hash_secret("geheim123"), rolle="admin")
    db.add(moderator)
    await db.commit()
    login = await client.post(
        "/api/v1/auth/moderator/login", data={"username": "admin", "password": "geheim123"}
    )
    return login.json()["access_token"]


async def test_update_status_ohne_login_verweigert(client):
    response = await client.get("/api/v1/moderator/update")
    assert response.status_code == 401


async def test_update_status_default_kanal_ist_stable(client, db):
    token = await _admin_token(client, db)
    response = await client.get(
        "/api/v1/moderator/update", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    assert response.json()["kanal"] == "stable"


async def test_update_kanal_auf_beta_umschalten(client, db):
    token = await _admin_token(client, db)
    response = await client.put(
        "/api/v1/moderator/update/kanal",
        json={"kanal": "beta"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()["kanal"] == "beta"

    erneut = await client.get(
        "/api/v1/moderator/update", headers={"Authorization": f"Bearer {token}"}
    )
    assert erneut.json()["kanal"] == "beta"


async def test_update_kanal_ungueltiger_wert_abgelehnt(client, db):
    token = await _admin_token(client, db)
    response = await client.put(
        "/api/v1/moderator/update/kanal",
        json={"kanal": "nightly"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 422
