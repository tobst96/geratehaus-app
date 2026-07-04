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
async def test_browse_ordner_und_dateien(db, monkeypatch):
    class FakeBrowseS3:
        def list_objects_v2(self, Bucket, Prefix="", Delimiter=None):  # noqa: N803
            if Delimiter:
                return {
                    "CommonPrefixes": [{"Prefix": "einsatz-1/"}],
                    "Contents": [{"Key": "info.txt", "Size": 3, "LastModified": datetime.now(timezone.utc)}],
                }
            return {"Contents": []}

    monkeypatch.setattr(minio_service, "_client", lambda cfg: FakeBrowseS3())
    await _minio_aktivieren(db)
    r = await minio_service.browse(db, "einsaetze", "")
    assert r["ordner"] == ["einsatz-1/"]
    assert r["dateien"][0]["key"] == "info.txt"


@pytest.mark.asyncio
async def test_minio_dokumente_im_backup(db, tmp_path, monkeypatch):
    monkeypatch.setattr(backup_service.settings, "upload_dir", str(tmp_path / "u"))
    await config_service.set(db, "backup_lokal_aktiv", True)
    await config_service.set(db, "backup_lokal_pfad", str(tmp_path / "b"))
    await config_service.set(db, "backup_webdav_aktiv", False)
    await config_service.set(db, "backup_passphrase", "geheim123")

    async def fake_aktiv(_db):
        return True

    async def fake_buckets(_db):
        return ["einsaetze"]

    async def fake_alle(_db, bucket):
        return ["einsatz-1/bericht.pdf"] if bucket == "einsaetze" else []

    async def fake_lesen(_db, bucket, key):
        return b"PDFDATA"

    put_calls: list = []

    async def fake_put(_db, bucket, key, daten, content_type="application/octet-stream"):
        put_calls.append((bucket, key, daten))

    m = backup_service.minio_service
    monkeypatch.setattr(m, "aktiv", fake_aktiv)
    monkeypatch.setattr(m, "dokument_buckets", fake_buckets)
    monkeypatch.setattr(m, "alle_objekte", fake_alle)
    monkeypatch.setattr(m, "objekt_lesen", fake_lesen)
    monkeypatch.setattr(m, "put_bytes", fake_put)

    backup = await backup_service.erstelle_backup(db)
    blob = (tmp_path / "b" / backup.dateiname).read_bytes()
    token, manifest, kategorien = backup_service.analysiere(blob, "geheim123")
    assert manifest["minio_objekte"] == 1
    assert next(k for k in kategorien if k["key"] == "minio")["anzahl"] == 1

    await backup_service.importiere(db, token, ["minio"], "zusammenfuehren")
    assert ("einsaetze", "einsatz-1/bericht.pdf", b"PDFDATA") in put_calls


@pytest.mark.asyncio
async def test_minio_backup_ziel_ausgewaehlt(db, monkeypatch):
    await config_service.set(db, "backup_lokal_aktiv", False)
    await _minio_aktivieren(db)
    await config_service.set(db, "backup_minio_aktiv", True)
    await config_service.set(db, "minio_bucket_backups", "buck")

    ziele = await backup_service._aktive_ziele(db)
    assert any(z.name == "minio" for z in ziele)
