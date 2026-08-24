"""2FA-Druck-Fallback (Etappe AA, revidiert Etappe V): `zwei_faktor_pflicht` ist
wieder standardmäßig aktiv. Schlägt der Mailversand des Anmelde-Codes fehl (oder
ist SMTP nicht konfiguriert), weicht `zwei_faktor_service.otp_erzeugen_und_senden`
auf den Netzwerkdrucker-Fallback (IPP, Etappe K) aus, sofern einer konfiguriert
ist. Sind weder Mail noch Drucker verfügbar, bleiben die bei der 2FA-Einrichtung
ausgegebenen Recovery-Codes der letzte Ausweg – der Login wird dadurch nie
vollständig blockiert (das war der auslösende Vorfall hinter Etappe V)."""

import pytest

from app.core.security import hash_secret
from app.models.person import Person
from app.services import druck_service, zwei_faktor_service
from app.services.config_service import config_service
from app.services.notifier.email import EmailNotifier


async def _person(db, email="mod@example.org"):
    person = Person(
        name="Mod",
        email=email,
        gruppenfuehrer_rolle="admin",
        passwort_hash=hash_secret("geheim123"),
    )
    db.add(person)
    await db.commit()
    await db.refresh(person)
    return person


@pytest.mark.asyncio
async def test_otp_mail_erfolg_druckt_nicht(db, monkeypatch):
    versendet: list[tuple[str, str]] = []

    async def fake_otp_versenden(self, _db, empfaenger, _betreff, _nachricht, code):
        versendet.append((empfaenger, code))

    gedruckt: list[bytes] = []

    async def fake_druck(_db, pdf):
        gedruckt.append(pdf)
        return True

    monkeypatch.setattr(EmailNotifier, "otp_versenden", fake_otp_versenden)
    monkeypatch.setattr(druck_service, "drucke_pdf_falls_konfiguriert", fake_druck)

    person = await _person(db)
    weg = await zwei_faktor_service.otp_erzeugen_und_senden(db, person)

    assert weg == "email"
    assert len(versendet) == 1
    assert versendet[0][0] == "mod@example.org"
    assert gedruckt == []


@pytest.mark.asyncio
async def test_otp_smtp_fehler_druckt_als_fallback(db, monkeypatch):
    """Regression: ein SMTP-Ausfall darf den Login nicht mehr komplett
    blockieren (der Vorfall hinter Etappe V) – der Code wird stattdessen an den
    konfigurierten Netzwerkdrucker geschickt."""
    await config_service.set(db, "drucker_aktiv", True)
    await config_service.set(db, "drucker_ipp_url", "ipp://p.local/ipp/print")

    async def fail_mail(self, *a, **k):
        raise RuntimeError("smtp down")

    gedruckt: list[bytes] = []

    async def fake_druck(_ipp, pdf):
        gedruckt.append(pdf)

    monkeypatch.setattr(EmailNotifier, "otp_versenden", fail_mail)
    monkeypatch.setattr(druck_service, "drucke_pdf", fake_druck)

    person = await _person(db)
    weg = await zwei_faktor_service.otp_erzeugen_und_senden(db, person)

    assert weg == "druck"
    assert len(gedruckt) == 1
    # Echtes, gerendertes PDF (kein Fake-Inhalt) – enthält den erzeugten Code.
    assert gedruckt[0].startswith(b"%PDF")
    assert person.otp_code_hash is not None


@pytest.mark.asyncio
async def test_otp_ohne_smtp_konfiguration_druckt_als_fallback(db, monkeypatch):
    """Wie oben, aber SMTP ist gar nicht erst konfiguriert statt aktiv zu
    scheitern – muss ebenso auf den Drucker ausweichen."""
    await config_service.set(db, "drucker_aktiv", True)
    await config_service.set(db, "drucker_ipp_url", "ipp://p.local/ipp/print")

    # notifier_email_smtp_host bleibt Default "" → aiosmtplib scheitert an
    # fehlendem Host, hier direkt simuliert statt echten SMTP-Timeout abzuwarten.
    async def fail_mail(self, *a, **k):
        raise OSError("kein SMTP-Host konfiguriert")

    gedruckt: list[bytes] = []

    async def fake_druck(_ipp, pdf):
        gedruckt.append(pdf)

    monkeypatch.setattr(EmailNotifier, "otp_versenden", fail_mail)
    monkeypatch.setattr(druck_service, "drucke_pdf", fake_druck)

    person = await _person(db)
    weg = await zwei_faktor_service.otp_erzeugen_und_senden(db, person)

    assert weg == "druck"
    assert len(gedruckt) == 1


@pytest.mark.asyncio
async def test_otp_weder_mail_noch_drucker_recovery_code_bleibt_moeglich(db, monkeypatch):
    """Ist weder SMTP noch Drucker verfügbar, meldet der Versand 'keiner' – der
    Login bleibt aber über die vorhandenen Recovery-Codes möglich (kein
    kompletter Ausschluss in keinem Fall)."""

    async def fail_mail(self, *a, **k):
        raise RuntimeError("smtp down")

    monkeypatch.setattr(EmailNotifier, "otp_versenden", fail_mail)
    # drucker_aktiv bleibt Default False → drucke_pdf_falls_konfiguriert liefert False.

    person = await _person(db)
    weg = await zwei_faktor_service.otp_erzeugen_und_senden(db, person)
    assert weg == "keiner"

    recovery_codes = await zwei_faktor_service.recovery_codes_erzeugen(db, person)
    assert await zwei_faktor_service.recovery_code_pruefen(db, person, recovery_codes[0]) is True


@pytest.mark.asyncio
async def test_otp_druck_fehlgeschlagen_gilt_als_kein_versandweg(db, monkeypatch):
    """Auch ein konfigurierter, aber tatsächlich nicht erreichbarer Drucker darf
    keine Exception nach außen werfen – Best-Effort wie beim PDF-Druck-Fallback."""
    await config_service.set(db, "drucker_aktiv", True)
    await config_service.set(db, "drucker_ipp_url", "ipp://p.local/ipp/print")

    async def fail_mail(self, *a, **k):
        raise RuntimeError("smtp down")

    async def fail_druck(_ipp, _pdf):
        from app.services.druck_service import DruckFehler

        raise DruckFehler("Drucker nicht erreichbar")

    monkeypatch.setattr(EmailNotifier, "otp_versenden", fail_mail)
    monkeypatch.setattr(druck_service, "drucke_pdf", fail_druck)

    person = await _person(db)
    weg = await zwei_faktor_service.otp_erzeugen_und_senden(db, person)
    assert weg == "keiner"
