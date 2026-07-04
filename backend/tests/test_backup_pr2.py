"""PR2-Tests: S3-/SFTP-/E-Mail-Ziel-Auswahl, S3-Ziel-Logik (mit Fake-Client),
PDF-Archiv-Hook."""

import io

import pytest

from app.services import backup_service, pdf_service
from app.services.config_service import config_service


class FakeS3:
    def __init__(self):
        self.objekte: dict[str, bytes] = {}

    def put_object(self, Bucket, Key, Body):  # noqa: N803
        self.objekte[Key] = Body

    def delete_object(self, Bucket, Key):  # noqa: N803
        self.objekte.pop(Key, None)

    def get_object(self, Bucket, Key):  # noqa: N803
        return {"Body": io.BytesIO(self.objekte[Key])}

    def get_paginator(self, _name):
        outer = self

        class Pag:
            def paginate(self, Bucket, Prefix):  # noqa: N803
                return [{"Contents": [{"Key": k} for k in outer.objekte if k.startswith(Prefix)]}]

        return Pag()


@pytest.mark.asyncio
async def test_aktive_ziele_umfassen_s3_sftp_email(db):
    await config_service.set(db, "backup_lokal_aktiv", False)
    await config_service.set(db, "backup_s3_aktiv", True)
    await config_service.set(db, "backup_s3_bucket", "buck")
    await config_service.set(db, "backup_sftp_aktiv", True)
    await config_service.set(db, "backup_sftp_host", "host")
    await config_service.set(db, "backup_email_aktiv", True)
    await config_service.set(db, "notifier_email_recipients", "a@x.de")

    ziele = await backup_service._aktive_ziele(db)
    namen = {z.name for z in ziele}
    assert {"s3", "sftp", "email"} <= namen


@pytest.mark.asyncio
async def test_s3_ziel_speichern_liste_retention(db, monkeypatch):
    fake = FakeS3()
    monkeypatch.setattr(backup_service.S3Ziel, "_client", lambda self: fake)
    ziel = backup_service.S3Ziel("http://minio:9000", "us-east-1", "buck", "a", "s", "backups")

    await ziel.speichern("geratehaus-backup-20260101-000001.ghb", b"x")
    await ziel.speichern("geratehaus-backup-20260102-000001.ghb", b"y")
    assert "backups/geratehaus-backup-20260101-000001.ghb" in fake.objekte
    liste = await ziel.liste()
    assert liste == [
        "geratehaus-backup-20260101-000001.ghb",
        "geratehaus-backup-20260102-000001.ghb",
    ]

    await config_service.set(db, "backup_max_anzahl", 1)
    await backup_service._retention(db, ziel)
    assert await ziel.liste() == ["geratehaus-backup-20260102-000001.ghb"]


@pytest.mark.asyncio
async def test_archiviere_pdf_nur_wenn_aktiv(db, monkeypatch):
    gespeichert: list[str] = []

    async def fake_speichern(self, dateiname, daten):
        gespeichert.append(dateiname)

    monkeypatch.setattr(backup_service.S3Ziel, "speichern", fake_speichern)
    await config_service.set(db, "backup_s3_aktiv", True)
    await config_service.set(db, "backup_s3_bucket", "buck")

    # Aus -> nichts
    await config_service.set(db, "backup_pdf_archiv_aktiv", False)
    await backup_service.archiviere_pdf(db, "einsaetze/einsatz-1.pdf", b"PDF")
    assert gespeichert == []

    # An -> gespeichert unter dem PDF-Präfix
    await config_service.set(db, "backup_pdf_archiv_aktiv", True)
    await config_service.set(db, "backup_pdf_archiv_pfad", "pdfs")
    await backup_service.archiviere_pdf(db, "einsaetze/einsatz-1.pdf", b"PDF")
    assert gespeichert == ["einsaetze/einsatz-1.pdf"]


@pytest.mark.asyncio
async def test_pdf_service_ruft_archiv(db, monkeypatch):
    gerufen: list[str] = []

    async def fake_archiv(db_, schluessel, pdf_bytes):
        gerufen.append(schluessel)

    monkeypatch.setattr(backup_service, "archiviere_pdf", fake_archiv)
    await pdf_service._archiviere(db, "listen/test.pdf", b"x")
    assert gerufen == ["listen/test.pdf"]


@pytest.mark.asyncio
async def test_email_ziel_versendet(db, monkeypatch):
    gesendet: list[str] = []

    async def fake_anhang(self, db_, empfaenger, betreff, nachricht, dateiname, inhalt, maintype, subtype):
        gesendet.append(empfaenger)

    monkeypatch.setattr(backup_service.EmailNotifier, "send_an_mit_anhang", fake_anhang)
    ziel = backup_service.EmailZiel(db, ["admin@x.de"])
    await ziel.speichern("b.ghb", b"data")
    assert gesendet == ["admin@x.de"]
