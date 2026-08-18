from app.core.security import hash_secret
from app.models.person import Person
from app.services import modul_service


async def _admin_token(client, db):
    db.add(Person(name="admin", email="admin", passwort_hash=hash_secret("geheim123"), gruppenfuehrer_rolle="admin"))
    await db.commit()
    login = await client.post(
        "/api/v1/auth/gruppenfuehrer/login", data={"username": "admin", "password": "geheim123"}
    )
    return login.json()["access_token"]


async def test_ensure_module_seedet_registry(db):
    await modul_service.ensure_module(db)
    keys = {m.key for m in await modul_service.liste_module(db)}
    assert {d.key for d in modul_service.MODUL_REGISTRY} <= keys
    assert "berechtigungen" in keys


async def test_ensure_module_idempotent(db):
    await modul_service.ensure_module(db)
    await modul_service.ensure_module(db)
    module = await modul_service.liste_module(db)
    assert len(module) == len(modul_service.MODUL_REGISTRY)


async def test_set_aktiv_schaltet_um(db):
    await modul_service.ensure_module(db)
    modul = await modul_service.set_aktiv(db, "dienstbuch", False)
    assert modul is not None and modul.aktiv is False
    assert await modul_service.set_aktiv(db, "gibt-es-nicht", False) is None


async def test_module_endpoint_erfordert_admin(client, db):
    await modul_service.ensure_module(db)
    ohne = await client.get("/api/v1/gruppenfuehrer/module")
    assert ohne.status_code == 401
    token = await _admin_token(client, db)
    mit = await client.get(
        "/api/v1/gruppenfuehrer/module", headers={"Authorization": f"Bearer {token}"}
    )
    assert mit.status_code == 200
    assert "einsatztagebuch" in {m["key"] for m in mit.json()}


async def test_modul_patch_setzt_aktiv(client, db):
    await modul_service.ensure_module(db)
    token = await _admin_token(client, db)
    resp = await client.patch(
        "/api/v1/gruppenfuehrer/module/barcodes",
        json={"aktiv": False},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["aktiv"] is False

    fehlend = await client.patch(
        "/api/v1/gruppenfuehrer/module/gibt-es-nicht",
        json={"aktiv": False},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert fehlend.status_code == 404
