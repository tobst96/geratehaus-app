"""Reproduziert den Bug, bei dem POST /setup mit dem tatsächlichen
Frontend-Payload (ohne geofence_*-Felder, siehe frontend/src/api/setup.ts)
mit 422 fehlschlug, weil das Backend-Schema diese Felder noch als Pflicht
verlangte – Überbleibsel aus der geofence- statt barcode-basierten
Kiosk-Identifikation. Siehe TODO.md / git log für den Kontext."""


async def _minimaler_frontend_payload() -> dict:
    """Exakt die Felder, die SetupWizard.tsx tatsächlich sendet."""
    return {
        "organisation_name": "Freiwillige Feuerwehr Test",
        "farbe_primaer": "#FFA633",
        "farbe_akzent": "#1A1A1A",
        "admin_vorname": "Max",
        "admin_nachname": "Mustermann",
        "admin_passwort": "geheim123",
        "fehlerberichte_aktiv": False,
    }


async def _erneut_payload() -> dict:
    """Payload für POST /setup/erneut-ausfuehren – ohne admin_*-Felder, siehe
    SetupBasis (Zugangsverwaltung läuft über „Erhöhter Zugang" in Personal)."""
    return {
        "organisation_name": "Freiwillige Feuerwehr Test",
        "farbe_primaer": "#FFA633",
        "farbe_akzent": "#1A1A1A",
        "fehlerberichte_aktiv": False,
    }


async def test_setup_status_ist_anfangs_nicht_eingerichtet(client):
    response = await client.get("/api/v1/setup/status")
    assert response.status_code == 200
    assert response.json()["ist_eingerichtet"] is False


async def test_setup_mit_frontend_payload_erfolgreich(client):
    response = await client.post("/api/v1/setup", json=await _minimaler_frontend_payload())
    assert response.status_code == 204

    status = await client.get("/api/v1/setup/status")
    assert status.json()["ist_eingerichtet"] is True


async def test_setup_login_funktioniert_nach_einrichtung(client):
    await client.post("/api/v1/setup", json=await _minimaler_frontend_payload())
    # Login mit dem echten Namen (Vorname + Nachname aus dem Wizard), nicht mehr
    # mit dem alten anonymen Platzhalter "admin".
    login = await client.post(
        "/api/v1/auth/gruppenfuehrer/login",
        data={"username": "Max Mustermann", "password": "geheim123"},
    )
    assert login.status_code == 200


async def test_setup_legt_admin_mit_echtem_namen_und_email_an(client):
    """Regression: keine anonyme "admin"-Platzhalterperson mehr – die erste
    Person trägt echten Namen/E-Mail und ist über person_elevieren zum Admin
    geworden (derselbe Weg wie "Erhöhter Zugang" in Personal)."""
    payload = await _minimaler_frontend_payload()
    payload["admin_email"] = "max@example.org"
    response = await client.post("/api/v1/setup", json=payload)
    assert response.status_code == 204

    from sqlalchemy import select

    from app.db.session import AsyncSessionLocal
    from app.models.person import Person

    async with AsyncSessionLocal() as db:
        personen = (await db.execute(select(Person))).scalars().all()

    assert len(personen) == 1
    person = personen[0]
    assert person.vorname == "Max"
    assert person.nachname == "Mustermann"
    assert person.email == "max@example.org"
    assert person.gruppenfuehrer_rolle == "admin"
    assert person.name != "admin"


async def test_setup_kann_nicht_zweimal_ausgefuehrt_werden(client):
    payload = await _minimaler_frontend_payload()
    erste = await client.post("/api/v1/setup", json=payload)
    assert erste.status_code == 204

    zweite = await client.post("/api/v1/setup", json=payload)
    assert zweite.status_code == 409


async def test_setup_module_liefert_nur_abschaltbare_module(client):
    response = await client.get("/api/v1/setup/module")
    assert response.status_code == 200
    module = response.json()
    keys = {m["key"] for m in module}
    assert "formular" in keys
    # Immer-aktive interne Module (z. B. Fahrzeuge, Personal) gehören nicht in
    # die Wizard-Auswahl, da sie sich nicht abschalten lassen.
    assert "fahrzeuge" not in keys
    assert "personal" not in keys


async def test_setup_mit_fahrzeugen_legt_sie_an(client):
    payload = await _minimaler_frontend_payload()
    payload["fahrzeuge"] = [{"name": "HLF 20"}, {"name": "MTF"}]
    response = await client.post("/api/v1/setup", json=payload)
    assert response.status_code == 204

    from sqlalchemy import select

    from app.db.session import AsyncSessionLocal
    from app.models.fahrzeug import Fahrzeug

    async with AsyncSessionLocal() as db:
        namen = set((await db.execute(select(Fahrzeug.name))).scalars().all())
    assert namen == {"HLF 20", "MTF"}


async def test_setup_mit_fahrzeugen_erneut_ausgefuehrt_dupliziert_nicht(client):
    """Regression: /setup/erneut-ausfuehren ruft dieselbe setup_durchfuehren-Logik
    auf – ohne Namensabgleich würden Fahrzeuge bei jedem erneuten Ausführen
    dupliziert."""
    from sqlalchemy import select

    from app.db.session import AsyncSessionLocal
    from app.models.fahrzeug import Fahrzeug

    payload = await _minimaler_frontend_payload()
    payload["fahrzeuge"] = [{"name": "HLF 20"}]
    erste = await client.post("/api/v1/setup", json=payload)
    assert erste.status_code == 204

    login = await client.post(
        "/api/v1/auth/gruppenfuehrer/login",
        data={"username": "Max Mustermann", "password": payload["admin_passwort"]},
    )
    token = login.json()["access_token"]

    erneut_payload = await _erneut_payload()
    erneut_payload["fahrzeuge"] = [{"name": "HLF 20"}]
    erneut = await client.post(
        "/api/v1/setup/erneut-ausfuehren",
        json=erneut_payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert erneut.status_code == 204

    async with AsyncSessionLocal() as db:
        namen = (await db.execute(select(Fahrzeug.name))).scalars().all()
    assert namen == ["HLF 20"]


async def test_setup_mit_modul_aktivierung(client):
    payload = await _minimaler_frontend_payload()
    payload["module_aktiv"] = {"formular": True}
    response = await client.post("/api/v1/setup", json=payload)
    assert response.status_code == 204

    from app.db.session import AsyncSessionLocal
    from app.services import feature_modul_service

    async with AsyncSessionLocal() as db:
        assert await feature_modul_service.ist_aktiv(db, "formular") is True


async def test_setup_mit_unbekanntem_oder_immer_aktivem_modul_key_kein_fehler(client):
    payload = await _minimaler_frontend_payload()
    payload["module_aktiv"] = {"unbekannt": True, "fahrzeuge": False}
    response = await client.post("/api/v1/setup", json=payload)
    assert response.status_code == 204


async def test_setup_mit_email_benachrichtigung(client):
    payload = await _minimaler_frontend_payload()
    payload["notifier"] = {
        "email_aktiv": True,
        "email_smtp_host": "smtp.example.org",
        "email_smtp_port": 587,
        "email_smtp_user": "user",
        "email_smtp_password": "geheim",
        "email_smtp_use_tls": True,
        "email_from": "geratehaus@example.org",
        "email_recipients": "gf@example.org",
        "push_aktiv": False,
    }
    response = await client.post("/api/v1/setup", json=payload)
    assert response.status_code == 204

    from app.db.session import AsyncSessionLocal
    from app.services.config_service import config_service

    async with AsyncSessionLocal() as db:
        assert await config_service.get(db, "notifier_email_aktiv") is True
        assert await config_service.get(db, "notifier_email_smtp_host") == "smtp.example.org"


async def test_setup_mit_push_generiert_vapid_schluessel(client):
    payload = await _minimaler_frontend_payload()
    payload["notifier"] = {
        "email_aktiv": False,
        "email_smtp_host": "",
        "email_smtp_port": 587,
        "email_smtp_user": "",
        "email_smtp_password": "",
        "email_smtp_use_tls": True,
        "email_from": "",
        "email_recipients": "",
        "push_aktiv": True,
    }
    response = await client.post("/api/v1/setup", json=payload)
    assert response.status_code == 204

    from app.db.session import AsyncSessionLocal
    from app.services.config_service import config_service

    async with AsyncSessionLocal() as db:
        assert await config_service.get(db, "notifier_webpush_aktiv") is True
        public_key = await config_service.get(db, "notifier_webpush_vapid_public_key")
        assert public_key


async def test_setup_push_erneut_ausgefuehrt_ueberschreibt_vapid_schluessel_nicht(client):
    """Regression: ein erneutes Setup darf bestehende VAPID-Keys nicht
    überschreiben, sonst werden aktive Push-Abonnements ungültig."""
    from app.db.session import AsyncSessionLocal
    from app.services.config_service import config_service

    notifier = {
        "email_aktiv": False,
        "email_smtp_host": "",
        "email_smtp_port": 587,
        "email_smtp_user": "",
        "email_smtp_password": "",
        "email_smtp_use_tls": True,
        "email_from": "",
        "email_recipients": "",
        "push_aktiv": True,
    }
    payload = await _minimaler_frontend_payload()
    payload["notifier"] = notifier
    erste = await client.post("/api/v1/setup", json=payload)
    assert erste.status_code == 204

    async with AsyncSessionLocal() as db:
        erster_key = await config_service.get(db, "notifier_webpush_vapid_public_key")

    login = await client.post(
        "/api/v1/auth/gruppenfuehrer/login",
        data={"username": "Max Mustermann", "password": payload["admin_passwort"]},
    )
    token = login.json()["access_token"]

    erneut_payload = await _erneut_payload()
    erneut_payload["notifier"] = notifier
    erneut = await client.post(
        "/api/v1/setup/erneut-ausfuehren",
        json=erneut_payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert erneut.status_code == 204

    async with AsyncSessionLocal() as db:
        zweiter_key = await config_service.get(db, "notifier_webpush_vapid_public_key")
    assert zweiter_key == erster_key
