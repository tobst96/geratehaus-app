"""Tests fürs MinIO-Modul: Aktiv-Logik, Dokument-Ablage (Einsatz-Ordner/JSON/PDF,
Dienstbuch flach) und MinIO-Backup-Ziel-Auswahl."""

from datetime import datetime, timezone
from types import SimpleNamespace

import pytest

from app.services import backup_service, minio_service
from app.services.config_service import config_service


class FakeS3:
    def __init__(self):
        self.objekte: dict[tuple, bytes] = {}
        self.buckets: set[str] = set()

    def head_bucket(self, Bucket):  # noqa: N803
        from botocore.exceptions import ClientError

        if Bucket not in self.buckets:
            raise ClientError({"Error": {"Code": "404"}}, "HeadBucket")

    def create_bucket(self, Bucket):  # noqa: N803
        self.buckets.add(Bucket)

    def put_object(self, Bucket, Key, Body, ContentType=None):  # noqa: N803
        self.buckets.add(Bucket)
        self.objekte[(Bucket, Key)] = Body

    def list_buckets(self):
        return {"Buckets": []}


async def _minio_aktivieren(db):
    await config_service.set(db, "modul_minio_aktiv", True)
    await config_service.set(db, "minio_access_key", "user")
    await config_service.set(db, "minio_secret_key", "pass")


@pytest.mark.asyncio
async def test_aktiv_erfordert_modul_und_key(db):
    assert await minio_service.aktiv(db) is False
    await config_service.set(db, "modul_minio_aktiv", True)
    assert await minio_service.aktiv(db) is False  # noch kein Key
    await config_service.set(db, "minio_access_key", "user")
    assert await minio_service.aktiv(db) is True


@pytest.mark.asyncio
async def test_einsatz_dokumente(db, monkeypatch):
    fake = FakeS3()
    monkeypatch.setattr(minio_service, "_client", lambda cfg: fake)
    await _minio_aktivieren(db)

    einsatz = SimpleNamespace(
        id=12, titel="B2", zeitpunkt=datetime(2026, 7, 4, tzinfo=timezone.utc),
        adresse="A", meldung="M", einsatznummer="1", status="offen", quelle="manuell",
        zusatzfelder={}, teilnahmen=[],
    )
    await minio_service.einsatz_dokumente(db, einsatz, pdf=b"PDFDATA")

    keys = {k for (_b, k) in fake.objekte}
    assert "einsatz-12/" in keys
    assert "einsatz-12/einsatz.json" in keys
    assert "einsatz-12/bericht.pdf" in keys
    assert ("einsaetze", "einsatz-12/bericht.pdf") in fake.objekte


@pytest.mark.asyncio
async def test_dienstbuch_dokument_flach(db, monkeypatch):
    fake = FakeS3()
    monkeypatch.setattr(minio_service, "_client", lambda cfg: fake)
    await _minio_aktivieren(db)

    await minio_service.dienstbuch_dokument(db, 7, b"PDF")
    assert ("dienstbuecher", "dienstbuch-7.pdf") in fake.objekte


@pytest.mark.asyncio
async def test_inaktiv_legt_nichts_ab(db, monkeypatch):
    fake = FakeS3()
    monkeypatch.setattr(minio_service, "_client", lambda cfg: fake)
    # Modul nicht aktiv → keine Ablage
    await minio_service.dienstbuch_dokument(db, 1, b"PDF")
    assert fake.objekte == {}


@pytest.mark.asyncio
async def test_minio_backup_ziel_ausgewaehlt(db, monkeypatch):
    await config_service.set(db, "backup_lokal_aktiv", False)
    await _minio_aktivieren(db)
    await config_service.set(db, "backup_minio_aktiv", True)
    await config_service.set(db, "minio_bucket_backups", "buck")

    ziele = await backup_service._aktive_ziele(db)
    assert any(z.name == "minio" for z in ziele)
