"""Druck-Fallback per IPP (Etappe K): der Netzwerkdrucker druckt das bereits
erzeugte Einsatz-/Dienstbuch-PDF – als Fallback bei Mail-Fehler und optional
„immer". Der IPP-Transport (`druck_service.drucke_pdf`) wird in den Integrations-
tests gemockt; separat gibt es Unit-Tests für die IPP-Kodierung selbst."""

from datetime import datetime, timezone

import httpx
import pytest

from app.core.security import hash_secret
from app.models.moderator import Moderator
from app.schemas.dienstbuch import DienstbuchAnlegen
from app.schemas.einsatz import EinsatzAnlegen
from app.services import dienstbuch_service, druck_service, einsatz_service
from app.services.config_service import config_service


# --- Unit: IPP-Transport ----------------------------------------------------


def test_http_ziel_wandelt_schema_und_port():
    assert druck_service._http_ziel("ipp://p.local/ipp/print") == "http://p.local:631/ipp/print"
    assert druck_service._http_ziel("ipps://p.local:443/x") == "https://p.local:443/x"
    assert druck_service._http_ziel("http://p:631/y") == "http://p:631/y"
    assert druck_service._http_ziel("ipp://p.local:9100/") == "http://p.local:9100/"


class _FakeAntwort:
    def __init__(self, status_code=200, content=b"\x01\x01\x00\x00\x00\x00\x00\x01"):
        self.status_code = status_code
        self.content = content


def _fake_client(recorder, antwort=None, fehler=None):
    class _Client:
        def __init__(self, *a, **k):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *a):
            return False

        async def post(self, url, content, headers):
            recorder["url"] = url
            recorder["body"] = content
            recorder["headers"] = headers
            if fehler is not None:
                raise fehler
            return antwort

    return _Client


@pytest.mark.asyncio
async def test_drucke_pdf_baut_gueltigen_request(monkeypatch):
    rec: dict = {}
    monkeypatch.setattr(
        druck_service.httpx, "AsyncClient", _fake_client(rec, antwort=_FakeAntwort())
    )
    await druck_service.drucke_pdf("ipp://p.local/ipp/print", b"%PDF-1.4 body")

    assert rec["url"] == "http://p.local:631/ipp/print"
    assert rec["headers"]["Content-Type"] == "application/ipp"
    body = rec["body"]
    assert body[:2] == b"\x01\x01"  # Version 1.1
    assert body[2:4] == b"\x00\x02"  # Print-Job
    assert b"printer-uri" in body and b"ipp://p.local/ipp/print" in body
    assert b"application/pdf" in body
    assert body.endswith(b"%PDF-1.4 body")  # Dokument angehängt


@pytest.mark.asyncio
async def test_drucke_pdf_ipp_fehlerstatus(monkeypatch):
    # IPP-Status 0x0400 (client-error) → DruckFehler.
    antwort = _FakeAntwort(content=b"\x01\x01\x04\x00\x00\x00\x00\x01")
    monkeypatch.setattr(druck_service.httpx, "AsyncClient", _fake_client({}, antwort=antwort))
    with pytest.raises(druck_service.DruckFehler):
        await druck_service.drucke_pdf("ipp://p/ipp/print", b"x")


@pytest.mark.asyncio
async def test_drucke_pdf_netzwerkfehler(monkeypatch):
    monkeypatch.setattr(
        druck_service.httpx,
        "AsyncClient",
        _fake_client({}, fehler=httpx.ConnectError("refused")),
    )
    with pytest.raises(druck_service.DruckFehler):
        await druck_service.drucke_pdf("ipp://p/ipp/print", b"x")


@pytest.mark.asyncio
async def test_drucke_pdf_leere_url_fehler():
    with pytest.raises(druck_service.DruckFehler):
        await druck_service.drucke_pdf("   ", b"x")


@pytest.mark.asyncio
async def test_falls_konfiguriert_inaktiv_druckt_nicht(db):
    # drucker_aktiv Default false → kein Druckversuch, Rückgabe False.
    assert await druck_service.drucke_pdf_falls_konfiguriert(db, b"x") is False


# --- Integration: Einsatz-Abschluss -----------------------------------------


async def _einsatz(db):
    return await einsatz_service.einsatz_anlegen(
        db,
        EinsatzAnlegen(titel="Testeinsatz", zeitpunkt=datetime(2026, 7, 1, 12, 0, tzinfo=timezone.utc)),
    )


@pytest.mark.asyncio
async def test_einsatz_immer_drucken_ohne_mail(db, monkeypatch):
    await config_service.set(db, "drucker_aktiv", True)
    await config_service.set(db, "drucker_immer_einsatz", True)
    await config_service.set(db, "drucker_ipp_url", "ipp://p.local/ipp/print")

    async def fake_pdf(_db, _einsatz):
        return b"%PDF einsatz"

    gedruckt: list[bytes] = []

    async def fake_druck(_ipp, pdf):
        gedruckt.append(pdf)

    monkeypatch.setattr(einsatz_service.pdf_service, "einsatz_pdf", fake_pdf)
    monkeypatch.setattr(druck_service, "drucke_pdf", fake_druck)

    einsatz = await _einsatz(db)
    await einsatz_service.einsatz_abschliessen(db, einsatz)

    assert gedruckt == [b"%PDF einsatz"]


@pytest.mark.asyncio
async def test_einsatz_smtp_fehler_druckt_als_fallback(db, monkeypatch):
    await config_service.set(db, "notifier_email_aktiv", True)
    await config_service.set(db, "notifier_email_pdf_bei_abschluss", True)
    await config_service.set(db, "drucker_aktiv", True)
    await config_service.set(db, "drucker_ipp_url", "ipp://p.local/ipp/print")

    async def fake_empf(_db, _ereignis):
        return ["a@example.org"]

    async def fake_pdf(_db, _einsatz):
        return b"%PDF fallback"

    async def fail_mail(self, *a, **k):
        raise RuntimeError("smtp down")

    gedruckt: list[bytes] = []

    async def fake_druck(_ipp, pdf):
        gedruckt.append(pdf)

    monkeypatch.setattr(
        einsatz_service.benachrichtigungskanal_service, "mail_empfaenger_fuer_ereignis", fake_empf
    )
    monkeypatch.setattr(einsatz_service.pdf_service, "einsatz_pdf", fake_pdf)
    monkeypatch.setattr(einsatz_service.EmailNotifier, "pdf_versenden", fail_mail)
    monkeypatch.setattr(druck_service, "drucke_pdf", fake_druck)

    einsatz = await _einsatz(db)
    await einsatz_service.einsatz_abschliessen(db, einsatz)

    assert gedruckt == [b"%PDF fallback"]


@pytest.mark.asyncio
async def test_einsatz_mail_erfolg_druckt_nicht(db, monkeypatch):
    # Mail aktiv + erfolgreich, kein „immer" → kein Druck.
    await config_service.set(db, "notifier_email_aktiv", True)
    await config_service.set(db, "notifier_email_pdf_bei_abschluss", True)
    await config_service.set(db, "drucker_aktiv", True)
    await config_service.set(db, "drucker_ipp_url", "ipp://p.local/ipp/print")

    async def fake_empf(_db, _ereignis):
        return ["a@example.org"]

    async def fake_pdf(_db, _einsatz):
        return b"%PDF"

    async def ok_mail(self, *a, **k):
        return None

    gedruckt: list[bytes] = []

    async def fake_druck(_ipp, pdf):
        gedruckt.append(pdf)

    monkeypatch.setattr(
        einsatz_service.benachrichtigungskanal_service, "mail_empfaenger_fuer_ereignis", fake_empf
    )
    monkeypatch.setattr(einsatz_service.pdf_service, "einsatz_pdf", fake_pdf)
    monkeypatch.setattr(einsatz_service.EmailNotifier, "pdf_versenden", ok_mail)
    monkeypatch.setattr(druck_service, "drucke_pdf", fake_druck)

    einsatz = await _einsatz(db)
    await einsatz_service.einsatz_abschliessen(db, einsatz)

    assert gedruckt == []


# --- Integration: Dienstbuch-Abschluss --------------------------------------


@pytest.mark.asyncio
async def test_dienstbuch_immer_drucken(db, monkeypatch):
    await config_service.set(db, "drucker_aktiv", True)
    await config_service.set(db, "drucker_immer_dienstbuch", True)
    await config_service.set(db, "drucker_ipp_url", "ipp://p.local/ipp/print")

    async def fake_pdf(_db, _dienstbuch):
        return b"%PDF dienstbuch"

    gedruckt: list[bytes] = []

    async def fake_druck(_ipp, pdf):
        gedruckt.append(pdf)

    monkeypatch.setattr(dienstbuch_service.pdf_service, "dienstbuch_pdf", fake_pdf)
    monkeypatch.setattr(druck_service, "drucke_pdf", fake_druck)

    dienstbuch = await dienstbuch_service.dienstbuch_anlegen(
        db, DienstbuchAnlegen(titel="Übung", eroeffnet_am=datetime(2026, 7, 4, 18, 0, tzinfo=timezone.utc))
    )
    await dienstbuch_service.dienstbuch_schliessen(db, dienstbuch)

    assert gedruckt == [b"%PDF dienstbuch"]


# --- Endpunkt: Testdruck ----------------------------------------------------


async def _admin_headers(client, db):
    db.add(Moderator(username="admin", passwort_hash=hash_secret("geheim123"), rolle="admin"))
    await db.commit()
    r = await client.post(
        "/api/v1/auth/moderator/login", data={"username": "admin", "password": "geheim123"}
    )
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.mark.asyncio
async def test_testdruck_inaktiv_liefert_502(client, db):
    h = await _admin_headers(client, db)
    # drucker_aktiv Default false → DruckFehler → 502.
    r = await client.post("/api/v1/moderator/einstellungen/testdruck", headers=h)
    assert r.status_code == 502


@pytest.mark.asyncio
async def test_testdruck_erfolg(client, db, monkeypatch):
    h = await _admin_headers(client, db)
    await config_service.set(db, "drucker_aktiv", True)
    await config_service.set(db, "drucker_ipp_url", "ipp://p.local/ipp/print")

    async def fake_druck(_ipp, _pdf):
        return None

    monkeypatch.setattr(druck_service, "drucke_pdf", fake_druck)

    r = await client.post("/api/v1/moderator/einstellungen/testdruck", headers=h)
    assert r.status_code == 204
