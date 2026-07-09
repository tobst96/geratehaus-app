from app.core.security import hash_secret
from app.models.person import Person
from app.services import berechtigungs_service, modul_service


async def _moderator(db, username, rolle):
    mod = Person(name=username, passwort_hash=hash_secret("geheim123"), gruppenfuehrer_rolle=rolle)
    db.add(mod)
    await db.commit()
    await db.refresh(mod)
    return mod


async def _token(client, username):
    login = await client.post(
        "/api/v1/auth/gruppenfuehrer/login", data={"username": username, "password": "geheim123"}
    )
    return login.json()["access_token"]


async def test_hat_zugriff_admin_bypass(db):
    await modul_service.ensure_module(db)
    admin = await _moderator(db, "admin", "admin")
    # Admin hat immer Zugriff, auch ohne Berechtigungszeile.
    assert await berechtigungs_service.hat_zugriff(db, admin, "einsatztagebuch") is True


async def test_hat_zugriff_gruppenfuehrer_ohne_und_mit_recht(db):
    await modul_service.ensure_module(db)
    gf = await _moderator(db, "gf", "gruppenfuehrer")
    assert await berechtigungs_service.hat_zugriff(db, gf, "einsatztagebuch") is False
    await berechtigungs_service.set_berechtigung(db, gf.id, "einsatztagebuch", True)
    assert await berechtigungs_service.hat_zugriff(db, gf, "einsatztagebuch") is True
    await berechtigungs_service.set_berechtigung(db, gf.id, "einsatztagebuch", False)
    assert await berechtigungs_service.hat_zugriff(db, gf, "einsatztagebuch") is False


async def test_set_berechtigung_unbekannt_gibt_false(db):
    await modul_service.ensure_module(db)
    gf = await _moderator(db, "gf", "gruppenfuehrer")
    assert await berechtigungs_service.set_berechtigung(db, gf.id, "gibt-es-nicht", True) is False
    assert await berechtigungs_service.set_berechtigung(db, 999999, "einsatztagebuch", True) is False


async def test_matrix_endpoint_admin_only(client, db):
    await modul_service.ensure_module(db)
    await _moderator(db, "admin", "admin")
    await _moderator(db, "gf", "gruppenfuehrer")

    ohne = await client.get("/api/v1/gruppenfuehrer/berechtigungen")
    assert ohne.status_code == 401

    token = await _token(client, "admin")
    resp = await client.get(
        "/api/v1/gruppenfuehrer/berechtigungen", headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 200
    daten = resp.json()
    assert len(daten["module"]) == len(modul_service.MODUL_REGISTRY)
    assert {"admin", "gf"} <= {m["username"] for m in daten["moderatoren"]}
    admin_row = next(m for m in daten["moderatoren"] if m["username"] == "admin")
    assert admin_row["ist_admin"] is True


async def test_put_berechtigung_setzt_und_matrix_zeigt(client, db):
    await modul_service.ensure_module(db)
    await _moderator(db, "admin", "admin")
    gf = await _moderator(db, "gf", "gruppenfuehrer")
    token = await _token(client, "admin")

    put = await client.put(
        f"/api/v1/gruppenfuehrer/berechtigungen/{gf.id}/dienstbuch",
        json={"erlaubt": True},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert put.status_code == 204

    resp = await client.get(
        "/api/v1/gruppenfuehrer/berechtigungen", headers={"Authorization": f"Bearer {token}"}
    )
    gf_row = next(m for m in resp.json()["moderatoren"] if m["username"] == "gf")
    assert "dienstbuch" in gf_row["module"]

    fehlend = await client.put(
        f"/api/v1/gruppenfuehrer/berechtigungen/{gf.id}/gibt-es-nicht",
        json={"erlaubt": True},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert fehlend.status_code == 404


async def test_enforcement_berechtigungen_seite(client, db):
    """Phase 4b: die Berechtigungen-Seite selbst ist granular geschützt. Ein
    Gruppenführer ohne Freigabe des Moduls „berechtigungen" bekommt 403, nach der
    Freigabe 200 (Admin hätte via Bypass immer Zugriff)."""
    await modul_service.ensure_module(db)
    await _moderator(db, "admin", "admin")
    gf = await _moderator(db, "gf", "gruppenfuehrer")
    h = {"Authorization": f"Bearer {await _token(client, 'gf')}"}

    ohne = await client.get("/api/v1/gruppenfuehrer/berechtigungen", headers=h)
    assert ohne.status_code == 403

    await berechtigungs_service.set_berechtigung(db, gf.id, "berechtigungen", True)
    mit = await client.get("/api/v1/gruppenfuehrer/berechtigungen", headers=h)
    assert mit.status_code == 200
