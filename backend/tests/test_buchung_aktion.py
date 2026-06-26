from datetime import datetime, timedelta, timezone

from app.models.fahrzeug import Fahrzeug
from app.models.person import Person
from app.schemas.buchung import BuchungAnfrage
from app.services import buchung_aktion_service, buchung_service
from app.services.config_service import config_service


async def _fahrzeug_und_person(db):
    fahrzeug = Fahrzeug(name="MTW", aktiv=True, buchbar=True, sitzplaetze=[])
    db.add(fahrzeug)
    person = Person(name="Test Person")
    db.add(person)
    await db.commit()
    await db.refresh(fahrzeug)
    await db.refresh(person)
    return fahrzeug, person


async def _anfrage_erstellen(db, fahrzeug, person, monkeypatch):
    gesendet = []

    async def fake_send(message, **kwargs):
        gesendet.append(message)

    monkeypatch.setattr("app.services.notifier.email.aiosmtplib.send", fake_send)
    await config_service.set(db, "oeffentliche_basis_url", "https://fw.beispiel.de")

    von = datetime.now(timezone.utc) + timedelta(days=1)
    bis = von + timedelta(hours=2)
    daten = BuchungAnfrage(fahrzeug_id=fahrzeug.id, von=von, bis=bis, zweck="Übung")
    buchung, _konflikt = await buchung_service.anfrage_erstellen(db, person.id, daten)
    return buchung, gesendet


async def test_anfrage_erstellt_aktion_mail_mit_buttons(db, monkeypatch):
    fahrzeug, person = await _fahrzeug_und_person(db)
    await config_service.set(db, "notifier_email_recipients", "moderator@example.org")
    buchung, gesendet = await _anfrage_erstellen(db, fahrzeug, person, monkeypatch)

    assert len(gesendet) == 1
    html_teile = [p for p in gesendet[0].walk() if p.get_content_type() == "text/html"]
    inhalt = html_teile[0].get_content()
    assert "Annehmen" in inhalt
    assert "Ablehnen" in inhalt
    assert f"/buchungen-aktion/" in inhalt


async def test_ohne_empfaengerliste_keine_aktion_mail(db, monkeypatch):
    fahrzeug, person = await _fahrzeug_und_person(db)
    await config_service.set(db, "notifier_email_recipients", "")
    _buchung, gesendet = await _anfrage_erstellen(db, fahrzeug, person, monkeypatch)
    assert gesendet == []


async def test_genehmigen_per_token_setzt_status(db, monkeypatch):
    fahrzeug, person = await _fahrzeug_und_person(db)
    await config_service.set(db, "notifier_email_recipients", "moderator@example.org")
    buchung, _ = await _anfrage_erstellen(db, fahrzeug, person, monkeypatch)

    token = await buchung_aktion_service.token_erstellen(db, buchung.id)
    aktualisiert, hinweis = await buchung_aktion_service.einloesen(db, token, "genehmigen")
    assert aktualisiert.status == "genehmigt"
    assert "angenommen" in hinweis


async def test_zweite_aktion_nach_entscheidung_aendert_nichts(db, monkeypatch):
    fahrzeug, person = await _fahrzeug_und_person(db)
    await config_service.set(db, "notifier_email_recipients", "moderator@example.org")
    buchung, _ = await _anfrage_erstellen(db, fahrzeug, person, monkeypatch)

    token1 = await buchung_aktion_service.token_erstellen(db, buchung.id)
    await buchung_aktion_service.einloesen(db, token1, "genehmigen")

    token2 = await buchung_aktion_service.token_erstellen(db, buchung.id)
    aktualisiert, hinweis = await buchung_aktion_service.einloesen(db, token2, "ablehnen")
    assert aktualisiert.status == "genehmigt"
    assert "bereits entschieden" in hinweis


async def test_abgelaufener_token_wird_erkannt(db):
    token = buchung_aktion_service.BuchungAktionToken(
        buchung_id=1,
        token="abc",
        erstellt_am=datetime.now(timezone.utc) - timedelta(days=20),
        ablauf_am=datetime.now(timezone.utc) - timedelta(days=6),
        eingeloest=False,
    )
    assert buchung_aktion_service.ist_abgelaufen(token) is True


async def test_genehmigen_endpunkt_mit_ungueltigem_token_404(client):
    response = await client.get("/api/v1/buchungen-aktion/nicht-vorhanden/genehmigen")
    assert response.status_code == 404
