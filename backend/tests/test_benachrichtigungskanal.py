from app.core.security import hash_secret
from app.models.person import Person
from app.services import benachrichtigungskanal_service as kanal_service


async def _person(db, name="Kanal Person"):
    person = Person(name=name)
    db.add(person)
    await db.commit()
    await db.refresh(person)
    return person


async def _admin_token(client, db):
    db.add(Person(name="admin", email="admin", passwort_hash=hash_secret("geheim123"), gruppenfuehrer_rolle="admin"))
    await db.commit()
    login = await client.post(
        "/api/v1/auth/gruppenfuehrer/login", data={"username": "admin", "password": "geheim123"}
    )
    return login.json()["access_token"]


async def test_setzen_upsert_und_loeschen(db):
    person = await _person(db)
    k = await kanal_service.setzen(db, person.id, "telegram", "123", True)
    assert k is not None and k.zielwert == "123"
    # Upsert überschreibt statt zu duplizieren.
    k2 = await kanal_service.setzen(db, person.id, "telegram", "456", False)
    assert k2.zielwert == "456" and k2.aktiv is False
    assert len(await kanal_service.liste_fuer_person(db, person.id)) == 1
    assert await kanal_service.loeschen(db, person.id, "telegram") is True
    assert await kanal_service.loeschen(db, person.id, "telegram") is False


async def test_mail_kanal_ignoriert_zielwert(db):
    """Der Mail-Kanal nutzt die E-Mail der Person; ein übergebener Zielwert wird
    nicht gespeichert (keine doppelte Adresse)."""
    person = await _person(db)
    k = await kanal_service.setzen(db, person.id, "mail", "trotzdem@x.de", True)
    assert k is not None and k.zielwert == ""


async def test_setzen_unbekannter_typ(db):
    person = await _person(db)
    assert await kanal_service.setzen(db, person.id, "brieftaube", "x", True) is None


async def test_kanal_typen_endpoint_admin_only(client, db):
    ohne = await client.get("/api/v1/gruppenfuehrer/kanal-typen")
    assert ohne.status_code == 401
    token = await _admin_token(client, db)
    resp = await client.get(
        "/api/v1/gruppenfuehrer/kanal-typen", headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 200
    assert {"mail", "telegram"} <= {t["key"] for t in resp.json()}


async def test_person_kanal_put_get_delete(client, db):
    person = await _person(db)
    token = await _admin_token(client, db)
    h = {"Authorization": f"Bearer {token}"}

    put = await client.put(
        f"/api/v1/gruppenfuehrer/personen/{person.id}/kanaele/telegram",
        json={"zielwert": "12345", "aktiv": True},
        headers=h,
    )
    assert put.status_code == 200 and put.json()["zielwert"] == "12345"

    liste = await client.get(f"/api/v1/gruppenfuehrer/personen/{person.id}/kanaele", headers=h)
    assert liste.status_code == 200 and any(k["typ"] == "telegram" for k in liste.json())

    weg = await client.delete(
        f"/api/v1/gruppenfuehrer/personen/{person.id}/kanaele/telegram", headers=h
    )
    assert weg.status_code == 204


async def test_person_kanal_fehlerfaelle(client, db):
    person = await _person(db)
    token = await _admin_token(client, db)
    h = {"Authorization": f"Bearer {token}"}

    # Unbekannte Person → 404
    assert (
        await client.get("/api/v1/gruppenfuehrer/personen/999999/kanaele", headers=h)
    ).status_code == 404
    # Unbekannter Kanaltyp → 400
    ungueltig = await client.put(
        f"/api/v1/gruppenfuehrer/personen/{person.id}/kanaele/brieftaube",
        json={"zielwert": "x", "aktiv": True},
        headers=h,
    )
    assert ungueltig.status_code == 400


async def test_enforcement_personal_modul(client, db):
    """Phase 4b: die Kanal-Endpunkte sind granular geschützt (Modul „personal").
    Gruppenführer ohne Freigabe → 403, mit Freigabe → 200 (Admin via Bypass immer)."""
    from app.services import berechtigungs_service, modul_service

    await modul_service.ensure_module(db)
    gf = Person(name="gf", email="gf", passwort_hash=hash_secret("geheim123"), gruppenfuehrer_rolle="gruppenfuehrer")
    db.add(gf)
    await db.commit()
    await db.refresh(gf)
    login = await client.post(
        "/api/v1/auth/gruppenfuehrer/login", data={"username": "gf", "password": "geheim123"}
    )
    h = {"Authorization": f"Bearer {login.json()['access_token']}"}

    assert (await client.get("/api/v1/gruppenfuehrer/kanal-typen", headers=h)).status_code == 403

    await berechtigungs_service.set_berechtigung(db, gf.id, "personal", True)
    assert (await client.get("/api/v1/gruppenfuehrer/kanal-typen", headers=h)).status_code == 200
