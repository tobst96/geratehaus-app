from app.core.security import hash_secret
from app.models.person import Person


async def _moderator_anlegen(db, username="admin", passwort="geheim123", rolle="admin"):
    gruppenfuehrer = Person(name=username, email=username, passwort_hash=hash_secret(passwort), gruppenfuehrer_rolle=rolle)
    db.add(gruppenfuehrer)
    await db.commit()
    await db.refresh(gruppenfuehrer)
    return gruppenfuehrer


async def test_login_mit_korrektem_passwort(client, db):
    await _moderator_anlegen(db, "admin", "geheim123")
    response = await client.post(
        "/api/v1/auth/gruppenfuehrer/login", data={"username": "admin", "password": "geheim123"}
    )
    assert response.status_code == 200
    assert "access_token" in response.json()


async def test_login_mit_falschem_passwort_schlaegt_fehl(client, db):
    await _moderator_anlegen(db, "admin", "geheim123")
    response = await client.post(
        "/api/v1/auth/gruppenfuehrer/login", data={"username": "admin", "password": "falsch"}
    )
    assert response.status_code == 401


async def test_login_mit_unbekanntem_benutzer_schlaegt_fehl(client):
    response = await client.post(
        "/api/v1/auth/gruppenfuehrer/login", data={"username": "niemand", "password": "egal"}
    )
    assert response.status_code == 401


async def test_login_wird_nach_zu_vielen_fehlversuchen_geblockt(client, db):
    await _moderator_anlegen(db, "admin", "geheim123")
    letzte_antwort = None
    for _ in range(15):
        letzte_antwort = await client.post(
            "/api/v1/auth/gruppenfuehrer/login", data={"username": "admin", "password": "falsch"}
        )
    assert letzte_antwort.status_code == 429


async def test_admin_only_route_ohne_token_verweigert(client):
    response = await client.get("/api/v1/gruppenfuehrer/einstellungen")
    assert response.status_code == 401


async def test_moderator_route_mit_gruppenfuehrer_rolle_kein_admin_zugriff(client, db):
    await _moderator_anlegen(db, "gf", "geheim123", rolle="gruppenfuehrer")
    login = await client.post(
        "/api/v1/auth/gruppenfuehrer/login", data={"username": "gf", "password": "geheim123"}
    )
    token = login.json()["access_token"]
    response = await client.get(
        "/api/v1/gruppenfuehrer/einstellungen", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 403


async def test_token_bleibt_gueltig_nach_namensaenderung(client, db):
    """Regressionstest: das JWT trägt die stabile Person.id als sub, nicht den
    Namen - sonst würde das eigene Umbenennen (Vorname/Nachname in Personal) das
    noch gültige Token sofort entwerten und die Person ausloggen."""
    admin = await _moderator_anlegen(db, "Alte Nachname", "geheim123")
    login = await client.post(
        "/api/v1/auth/gruppenfuehrer/login", data={"username": "Alte Nachname", "password": "geheim123"}
    )
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    response = await client.put(
        f"/api/v1/gruppenfuehrer/stammdaten/personen/{admin.id}",
        json={"vorname": "Neue", "nachname": "Nachname"},
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json()["name"] != "Alte Nachname"

    # dasselbe, alte Token muss weiterhin funktionieren
    response = await client.get("/api/v1/gruppenfuehrer/einstellungen", headers=headers)
    assert response.status_code == 200


async def test_token_wird_nach_passwortaenderung_ungueltig(client, db):
    """Regressionstest für die Token-Invalidierung: ein VOR der Passwortänderung
    ausgestelltes JWT muss danach abgelehnt werden (statt bis zum regulären Ablauf
    - bis zu `jwt_expire_minutes` - gültig zu bleiben). Sonst überlebt ein
    gestohlenes Token genau die Reaktion, die es entwerten sollte."""
    admin = await _moderator_anlegen(db, "admin", "geheim123")
    login = await client.post(
        "/api/v1/auth/gruppenfuehrer/login", data={"username": "admin", "password": "geheim123"}
    )
    altes_token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {altes_token}"}

    # Vorher: Token funktioniert.
    response = await client.get("/api/v1/gruppenfuehrer/einstellungen", headers=headers)
    assert response.status_code == 200

    from app.services import gruppenfuehrer_service

    await gruppenfuehrer_service.person_passwort_setzen(db, admin, "neuesPasswort1")

    # Danach: dasselbe, alte Token wird abgelehnt.
    response = await client.get("/api/v1/gruppenfuehrer/einstellungen", headers=headers)
    assert response.status_code == 401

    # Ein frisch ausgestelltes Token funktioniert wieder.
    neuer_login = await client.post(
        "/api/v1/auth/gruppenfuehrer/login", data={"username": "admin", "password": "neuesPasswort1"}
    )
    neue_headers = {"Authorization": f"Bearer {neuer_login.json()['access_token']}"}
    response = await client.get("/api/v1/gruppenfuehrer/einstellungen", headers=neue_headers)
    assert response.status_code == 200
