from app.core.security import hash_secret
from app.models.moderator import Moderator
from app.models.person import Person
from app.services import benachrichtigungskanal_service as kanal_service


async def _person(db, name="Kanal Person"):
    person = Person(name=name)
    db.add(person)
    await db.commit()
    await db.refresh(person)
    return person


async def _admin_token(client, db):
    db.add(Moderator(username="admin", passwort_hash=hash_secret("geheim123"), rolle="admin"))
    await db.commit()
    login = await client.post(
        "/api/v1/auth/moderator/login", data={"username": "admin", "password": "geheim123"}
    )
    return login.json()["access_token"]


async def test_setzen_upsert_und_loeschen(db):
    person = await _person(db)
    k = await kanal_service.setzen(db, person.id, "mail", "a@b.de", True)
    assert k is not None and k.zielwert == "a@b.de"
    # Upsert überschreibt statt zu duplizieren.
    k2 = await kanal_service.setzen(db, person.id, "mail", "neu@b.de", False)
    assert k2.zielwert == "neu@b.de" and k2.aktiv is False
    assert len(await kanal_service.liste_fuer_person(db, person.id)) == 1
    assert await kanal_service.loeschen(db, person.id, "mail") is True
    assert await kanal_service.loeschen(db, person.id, "mail") is False


async def test_setzen_unbekannter_typ(db):
    person = await _person(db)
    assert await kanal_service.setzen(db, person.id, "brieftaube", "x", True) is None


async def test_kanal_typen_endpoint_admin_only(client, db):
    ohne = await client.get("/api/v1/moderator/kanal-typen")
    assert ohne.status_code == 401
    token = await _admin_token(client, db)
    resp = await client.get(
        "/api/v1/moderator/kanal-typen", headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 200
    assert {"mail", "telegram"} <= {t["key"] for t in resp.json()}


async def test_person_kanal_put_get_delete(client, db):
    person = await _person(db)
    token = await _admin_token(client, db)
    h = {"Authorization": f"Bearer {token}"}

    put = await client.put(
        f"/api/v1/moderator/personen/{person.id}/kanaele/telegram",
        json={"zielwert": "12345", "aktiv": True},
        headers=h,
    )
    assert put.status_code == 200 and put.json()["zielwert"] == "12345"

    liste = await client.get(f"/api/v1/moderator/personen/{person.id}/kanaele", headers=h)
    assert liste.status_code == 200 and any(k["typ"] == "telegram" for k in liste.json())

    weg = await client.delete(
        f"/api/v1/moderator/personen/{person.id}/kanaele/telegram", headers=h
    )
    assert weg.status_code == 204


async def test_person_kanal_fehlerfaelle(client, db):
    person = await _person(db)
    token = await _admin_token(client, db)
    h = {"Authorization": f"Bearer {token}"}

    # Unbekannte Person → 404
    assert (
        await client.get("/api/v1/moderator/personen/999999/kanaele", headers=h)
    ).status_code == 404
    # Unbekannter Kanaltyp → 400
    ungueltig = await client.put(
        f"/api/v1/moderator/personen/{person.id}/kanaele/brieftaube",
        json={"zielwert": "x", "aktiv": True},
        headers=h,
    )
    assert ungueltig.status_code == 400
