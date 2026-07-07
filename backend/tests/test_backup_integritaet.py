"""Automatische Backup-Integritätsprüfung: rein lesende Prüfung (kein Restore in
eine echte DB) – gültiges Backup wird als ok erkannt, ein beschädigtes/fehlendes
als Fehler bzw. unbekannt; Ergebnis wird gespeichert und per Endpunkt geliefert."""

from pathlib import Path

import pytest

from app.core.security import hash_secret
from app.models.moderator import Moderator
from app.services import backup_service
from app.services.config_service import config_service


async def _setup_ziel(db, tmp_path: Path, passphrase="geheim123") -> Path:
    ziel = tmp_path / "backups"
    await config_service.set(db, "backup_lokal_aktiv", True)
    await config_service.set(db, "backup_lokal_pfad", str(ziel))
    await config_service.set(db, "backup_webdav_aktiv", False)
    await config_service.set(db, "backup_passphrase", passphrase)
    return ziel


@pytest.mark.asyncio
async def test_integritaet_ok(db, tmp_path, monkeypatch):
    await _setup_ziel(db, tmp_path)
    monkeypatch.setattr(backup_service.settings, "upload_dir", str(tmp_path / "u"))
    backup = await backup_service.erstelle_backup(db)

    info = await backup_service.pruefe_integritaet(db, backup)
    assert info["tabellen"] > 0
    assert info["groesse"] > 0


@pytest.mark.asyncio
async def test_speichern_setzt_ok(db, tmp_path, monkeypatch):
    await _setup_ziel(db, tmp_path)
    monkeypatch.setattr(backup_service.settings, "upload_dir", str(tmp_path / "u"))
    await backup_service.erstelle_backup(db)

    ergebnis = await backup_service.integritaet_pruefen_und_speichern(db)
    assert ergebnis["ok"] is True
    assert str(await config_service.get(db, "backup_integritaet_ok", "")) == "true"
    assert await config_service.get(db, "backup_integritaet_am", "")


@pytest.mark.asyncio
async def test_beschaedigtes_backup_meldet_fehler(db, tmp_path, monkeypatch):
    ziel = await _setup_ziel(db, tmp_path)
    monkeypatch.setattr(backup_service.settings, "upload_dir", str(tmp_path / "u"))
    backup = await backup_service.erstelle_backup(db)
    # Datei mit Müll überschreiben → Entschlüsselung/ZIP schlägt fehl.
    (ziel / backup.dateiname).write_bytes(b"kaputt")

    ergebnis = await backup_service.integritaet_pruefen_und_speichern(db)
    assert ergebnis["ok"] is False
    assert str(await config_service.get(db, "backup_integritaet_ok", "")) == "false"


@pytest.mark.asyncio
async def test_ohne_backup_unbekannt(db):
    ergebnis = await backup_service.integritaet_pruefen_und_speichern(db)
    assert ergebnis["ok"] is None


@pytest.mark.asyncio
async def test_endpunkt_pruefen(client, db, tmp_path, monkeypatch):
    await _setup_ziel(db, tmp_path)
    monkeypatch.setattr(backup_service.settings, "upload_dir", str(tmp_path / "u"))
    await backup_service.erstelle_backup(db)

    db.add(Moderator(username="admin", passwort_hash=hash_secret("geheim123"), rolle="admin"))
    await db.commit()
    r = await client.post(
        "/api/v1/auth/moderator/login", data={"username": "admin", "password": "geheim123"}
    )
    h = {"Authorization": f"Bearer {r.json()['access_token']}"}

    r = await client.post("/api/v1/moderator/backup/integritaet-pruefen", headers=h)
    assert r.status_code == 200
    assert r.json()["ok"] is True
    # Gespeichertes Ergebnis lesbar
    r = await client.get("/api/v1/moderator/backup/integritaet", headers=h)
    assert r.json()["ok"] is True
