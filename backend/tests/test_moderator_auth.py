from app.core.security import hash_secret
from app.models.moderator import Moderator


async def _moderator_anlegen(db, username="admin", passwort="geheim123", rolle="admin"):
    moderator = Moderator(username=username, passwort_hash=hash_secret(passwort), rolle=rolle)
    db.add(moderator)
    await db.commit()
    await db.refresh(moderator)
    return moderator


async def test_login_mit_korrektem_passwort(client, db):
    await _moderator_anlegen(db, "admin", "geheim123")
    response = await client.post(
        "/api/v1/auth/moderator/login", data={"username": "admin", "password": "geheim123"}
    )
    assert response.status_code == 200
    assert "access_token" in response.json()


async def test_login_mit_falschem_passwort_schlaegt_fehl(client, db):
    await _moderator_anlegen(db, "admin", "geheim123")
    response = await client.post(
        "/api/v1/auth/moderator/login", data={"username": "admin", "password": "falsch"}
    )
    assert response.status_code == 401


async def test_login_mit_unbekanntem_benutzer_schlaegt_fehl(client):
    response = await client.post(
        "/api/v1/auth/moderator/login", data={"username": "niemand", "password": "egal"}
    )
    assert response.status_code == 401


async def test_login_wird_nach_zu_vielen_fehlversuchen_geblockt(client, db):
    await _moderator_anlegen(db, "admin", "geheim123")
    letzte_antwort = None
    for _ in range(15):
        letzte_antwort = await client.post(
            "/api/v1/auth/moderator/login", data={"username": "admin", "password": "falsch"}
        )
    assert letzte_antwort.status_code == 429


async def test_admin_only_route_ohne_token_verweigert(client):
    response = await client.get("/api/v1/moderator/einstellungen")
    assert response.status_code == 401


async def test_moderator_route_mit_gruppenfuehrer_rolle_kein_admin_zugriff(client, db):
    await _moderator_anlegen(db, "gf", "geheim123", rolle="gruppenfuehrer")
    login = await client.post(
        "/api/v1/auth/moderator/login", data={"username": "gf", "password": "geheim123"}
    )
    token = login.json()["access_token"]
    response = await client.get(
        "/api/v1/moderator/einstellungen", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 403
