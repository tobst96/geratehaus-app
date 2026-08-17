from app.core.security import hash_secret
from app.models.person import Person
from app.services import benachrichtigungskanal_service as ks
from app.services import notifier_service
from app.services.notifier.email import EmailNotifier


async def _person(db, name, email=None):
    p = Person(name=name, email=email)
    db.add(p)
    await db.commit()
    await db.refresh(p)
    return p


async def _admin_token(client, db):
    db.add(Person(name="admin", passwort_hash=hash_secret("geheim123"), gruppenfuehrer_rolle="admin"))
    await db.commit()
    login = await client.post(
        "/api/v1/auth/gruppenfuehrer/login", data={"username": "admin", "password": "geheim123"}
    )
    return login.json()["access_token"]


async def test_benachrichtigungs_uebersicht(db):
    """Gebündelte Übersicht: Abos je Person; mail_aktiv nur bei aktivem Mail-Kanal
    UND hinterlegter E-Mail."""
    mit_mail = await _person(db, "MitMail", "a@x.de")
    ohne_mail = await _person(db, "OhneMail")  # Abo, aber keine E-Mail → mail_aktiv False
    await _person(db, "Ohne")  # weder Abo noch Kanal → nicht enthalten

    await ks.setzen(db, mit_mail.id, "mail", "", True)
    await ks.set_abo(db, mit_mail.id, "benachrichtigung_neuer_einsatz", True)
    await ks.setzen(db, ohne_mail.id, "mail", "", True)
    await ks.set_abo(db, ohne_mail.id, "benachrichtigung_neuer_einsatz", True)

    uebersicht = await ks.benachrichtigungs_uebersicht(db)
    assert uebersicht[mit_mail.id]["mail_aktiv"] is True
    assert "benachrichtigung_neuer_einsatz" in uebersicht[mit_mail.id]["ereignisse"]
    assert uebersicht[ohne_mail.id]["mail_aktiv"] is False


async def test_benachrichtigungs_uebersicht_endpoint(client, db):
    person = await _person(db, "Abo Endpoint", "e@x.de")
    await ks.setzen(db, person.id, "mail", "", True)
    await ks.set_abo(db, person.id, "benachrichtigung_neues_dienstbuch", True)
    token = await _admin_token(client, db)

    r = await client.get(
        "/api/v1/gruppenfuehrer/personen/benachrichtigungs-uebersicht",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200
    eintrag = next(e for e in r.json() if e["person_id"] == person.id)
    assert eintrag["mail_aktiv"] is True
    assert "benachrichtigung_neues_dienstbuch" in eintrag["ereignisse"]


async def test_set_abo_und_lesen(db):
    p = await _person(db, "Abo")
    assert await ks.set_abo(db, p.id, "benachrichtigung_neuer_einsatz", True) is True
    assert "benachrichtigung_neuer_einsatz" in await ks.abos_fuer_person(db, p.id)
    assert await ks.set_abo(db, p.id, "gibt-es-nicht", True) is False
    await ks.set_abo(db, p.id, "benachrichtigung_neuer_einsatz", False)
    assert await ks.abos_fuer_person(db, p.id) == []


async def test_empfaenger_nur_abonnenten_mit_kanal(db):
    abonnent = await _person(db, "Abonnent", "abo@x.de")
    ohne_kanal = await _person(db, "OhneKanal", "ohne@x.de")
    ohne_abo = await _person(db, "OhneAbo", "nein@x.de")

    await ks.setzen(db, abonnent.id, "mail", "", True)
    await ks.set_abo(db, abonnent.id, "benachrichtigung_neuer_einsatz", True)
    await ks.set_abo(db, ohne_kanal.id, "benachrichtigung_neuer_einsatz", True)  # kein Kanal
    await ks.setzen(db, ohne_abo.id, "mail", "", True)  # kein Abo

    empfaenger = await ks.empfaenger_fuer_ereignis(db, "benachrichtigung_neuer_einsatz")
    namen = {p.name for p, _ in empfaenger}
    assert namen == {"Abonnent"}


async def test_benachrichtige_geht_nur_an_abonnenten(db, monkeypatch):
    gesendet: list[str] = []

    async def fake_send_an(self, db, empfaenger, betreff, nachricht):
        gesendet.append(empfaenger)

    monkeypatch.setattr(EmailNotifier, "send_an", fake_send_an)

    abonnent = await _person(db, "Abonnent", "abo@x.de")
    ohne_abo = await _person(db, "OhneAbo", "nein@x.de")
    await ks.setzen(db, abonnent.id, "mail", "", True)
    await ks.set_abo(db, abonnent.id, "benachrichtigung_neuer_einsatz", True)
    await ks.setzen(db, ohne_abo.id, "mail", "", True)

    await notifier_service.benachrichtige(db, "benachrichtigung_neuer_einsatz", titel="Test")

    assert gesendet == ["abo@x.de"]


async def test_mail_empfaenger_nur_mail_kanal(db):
    """Für den PDF-Versand: nur Mail-Zielwerte der Abonnenten, keine Telegram."""
    p_mail = await _person(db, "MailAbo", "m@x.de")
    p_tg = await _person(db, "TelegramAbo", "tg@x.de")
    await ks.setzen(db, p_mail.id, "mail", "", True)
    await ks.set_abo(db, p_mail.id, "benachrichtigung_neuer_einsatz", True)
    await ks.setzen(db, p_tg.id, "telegram", "999", True)
    await ks.set_abo(db, p_tg.id, "benachrichtigung_neuer_einsatz", True)

    adressen = await ks.mail_empfaenger_fuer_ereignis(db, "benachrichtigung_neuer_einsatz")
    assert adressen == ["m@x.de"]


async def test_benachrichtige_inaktiver_kanal_wird_uebersprungen(db, monkeypatch):
    gesendet: list[str] = []

    async def fake_send_an(self, db, empfaenger, betreff, nachricht):
        gesendet.append(empfaenger)

    monkeypatch.setattr(EmailNotifier, "send_an", fake_send_an)

    p = await _person(db, "Inaktiv", "x@x.de")
    await ks.setzen(db, p.id, "mail", "", False)  # Kanal inaktiv
    await ks.set_abo(db, p.id, "benachrichtigung_neuer_einsatz", True)

    await notifier_service.benachrichtige(db, "benachrichtigung_neuer_einsatz", titel="Test")
    assert gesendet == []


async def test_mail_kanal_ohne_person_email_kein_versand(db, monkeypatch):
    """Mail-Kanal aktiv + abonniert, aber Person ohne E-Mail → kein Versand."""
    gesendet: list[str] = []

    async def fake_send_an(self, db, empfaenger, betreff, nachricht):
        gesendet.append(empfaenger)

    monkeypatch.setattr(EmailNotifier, "send_an", fake_send_an)

    p = await _person(db, "OhneMail")  # keine E-Mail
    await ks.setzen(db, p.id, "mail", "", True)
    await ks.set_abo(db, p.id, "benachrichtigung_neuer_einsatz", True)

    await notifier_service.benachrichtige(db, "benachrichtigung_neuer_einsatz", titel="Test")
    assert gesendet == []


async def test_abo_endpoints(client, db):
    from app.services.config_service import config_service

    person = await _person(db, "Endpoint")
    token = await _admin_token(client, db)
    h = {"Authorization": f"Bearer {token}"}

    # Einsatz-Ereignis wird nur bei aktivem Einsatztagebuch-Modul angeboten.
    await config_service.set(db, "modul_einsatztagebuch_aktiv", True)
    typen = await client.get("/api/v1/gruppenfuehrer/ereignis-typen", headers=h)
    assert typen.status_code == 200
    assert "benachrichtigung_neuer_einsatz" in {t["key"] for t in typen.json()}

    put = await client.put(
        f"/api/v1/gruppenfuehrer/personen/{person.id}/abos/benachrichtigung_neuer_einsatz",
        json={"aktiv": True},
        headers=h,
    )
    assert put.status_code == 204

    abos = await client.get(f"/api/v1/gruppenfuehrer/personen/{person.id}/abos", headers=h)
    assert abos.status_code == 200 and "benachrichtigung_neuer_einsatz" in abos.json()

    ungueltig = await client.put(
        f"/api/v1/gruppenfuehrer/personen/{person.id}/abos/gibt-es-nicht",
        json={"aktiv": True},
        headers=h,
    )
    assert ungueltig.status_code == 400
