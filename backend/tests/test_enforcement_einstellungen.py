from app.core.security import hash_secret
from app.models.person import Person
from app.services import berechtigungs_service, modul_service


async def _gruppenfuehrer(client, db):
    await modul_service.ensure_module(db)
    gf = Person(name="gf", passwort_hash=hash_secret("geheim123"), gruppenfuehrer_rolle="gruppenfuehrer")
    db.add(gf)
    await db.commit()
    await db.refresh(gf)
    login = await client.post(
        "/api/v1/auth/gruppenfuehrer/login", data={"username": "gf", "password": "geheim123"}
    )
    return gf, login.json()["access_token"]


async def test_einstellungen_granular_geschuetzt(client, db):
    gf, token = await _gruppenfuehrer(client, db)
    h = {"Authorization": f"Bearer {token}"}

    assert (await client.get("/api/v1/gruppenfuehrer/einstellungen", headers=h)).status_code == 403

    await berechtigungs_service.set_berechtigung(db, gf.id, "einstellungen", True)
    assert (await client.get("/api/v1/gruppenfuehrer/einstellungen", headers=h)).status_code == 200


async def test_update_ohne_einstellungen_403(client, db):
    _gf, token = await _gruppenfuehrer(client, db)
    h = {"Authorization": f"Bearer {token}"}
    # Ohne Freigabe blockt das Gate vor der Endpoint-Logik (kein externer Call).
    assert (await client.get("/api/v1/gruppenfuehrer/update", headers=h)).status_code == 403
