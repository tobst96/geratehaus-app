from app.core.security import hash_secret
from app.models.moderator import Moderator
from app.models.person import Person


async def _gruppenfuehrer_token(client, db):
    moderator = Moderator(username="gf", passwort_hash=hash_secret("geheim123"), rolle="gruppenfuehrer")
    db.add(moderator)
    await db.commit()
    login = await client.post(
        "/api/v1/auth/moderator/login", data={"username": "gf", "password": "geheim123"}
    )
    return login.json()["access_token"]


async def _person(db, name="Belohnte Person"):
    person = Person(name=name)
    db.add(person)
    await db.commit()
    await db.refresh(person)
    return person


async def test_belohnung_ohne_login_verweigert(client, db):
    person = await _person(db)
    response = await client.post(
        "/api/v1/moderator/punkte/belohnung",
        json={"person_id": person.id, "punkte": 5, "grund": "Test"},
    )
    assert response.status_code == 401


async def test_gruppenfuehrer_kann_belohnung_vergeben(client, db):
    person = await _person(db)
    token = await _gruppenfuehrer_token(client, db)
    response = await client.post(
        "/api/v1/moderator/punkte/belohnung",
        json={"person_id": person.id, "punkte": 10, "grund": "Tolle Mitarbeit"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 201
    assert response.json()["gesamtpunkte"] == 10


async def test_belohnung_fuer_unbekannte_person_404(client, db):
    token = await _gruppenfuehrer_token(client, db)
    response = await client.post(
        "/api/v1/moderator/punkte/belohnung",
        json={"person_id": 999999, "punkte": 5, "grund": "Test"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 404


async def test_gruppenfuehrer_kann_personenliste_lesen(client, db):
    await _person(db, "Sichtbare Person")
    token = await _gruppenfuehrer_token(client, db)
    response = await client.get(
        "/api/v1/moderator/stammdaten/personen", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    assert any(p["name"] == "Sichtbare Person" for p in response.json())


async def test_gruppenfuehrer_kann_person_nicht_anlegen(client, db):
    token = await _gruppenfuehrer_token(client, db)
    response = await client.post(
        "/api/v1/moderator/stammdaten/personen",
        json={"vorname": "Neu", "nachname": "Person"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403
