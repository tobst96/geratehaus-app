"""Tests fürs Backup-Modul: Export/Verschlüsselung, Analyse, Roundtrip-Import,
Retention und Fehlerpfad."""

from pathlib import Path

import pytest
from sqlalchemy import select

from app.models.person import Person
from app.services import backup_service
from app.services.config_service import config_service


async def _setup_ziel(db, tmp_path: Path, passphrase="geheim123") -> Path:
    ziel = tmp_path / "backups"
    await config_service.set(db, "backup_lokal_aktiv", True)
    await config_service.set(db, "backup_lokal_pfad", str(ziel))
    await config_service.set(db, "backup_webdav_aktiv", False)
    await config_service.set(db, "backup_passphrase", passphrase)
    await config_service.set(db, "backup_max_anzahl", 7)
    return ziel


@pytest.mark.asyncio
async def test_backup_roundtrip_ersetzen(db, tmp_path, monkeypatch):
    ziel = await _setup_ziel(db, tmp_path)
    # Uploads mit einer Datei (Logo) – muss beim Import wiederkommen.
    uploads = tmp_path / "uploads"
    uploads.mkdir()
    (uploads / "logo.png").write_bytes(b"PNGDATA")
    monkeypatch.setattr(backup_service.settings, "upload_dir", str(uploads))

    person = Person(name="Backup Tester")
    db.add(person)
    await db.commit()

    backup = await backup_service.erstelle_backup(db, ausloeser="manuell")
    assert backup.status == "ok" and backup.verschluesselt is True
    datei = ziel / backup.dateiname
    assert datei.exists()
    # Verschlüsselt: beginnt mit MAGIC, nicht mit ZIP-Signatur.
    blob = datei.read_bytes()
    assert blob.startswith(backup_service.MAGIC)

    # Analyse liefert Kategorien inkl. Personal-Anzahl.
    token, manifest, kategorien = backup_service.analysiere(blob, "geheim123")
    personal = next(k for k in kategorien if k["key"] == "personal")
    assert personal["anzahl"] >= 1
    dateien = next(k for k in kategorien if k["key"] == "dateien")
    assert dateien["anzahl"] >= 1

    # Person + Datei löschen, dann Import (ersetzen) → wiederhergestellt.
    await db.execute(Person.__table__.delete())
    await db.commit()
    (uploads / "logo.png").unlink()

    ergebnis = await backup_service.importiere(db, token, ["personal", "dateien"], "ersetzen")
    assert ergebnis["importierte_dateien"] >= 1
    namen = [p.name for p in (await db.execute(select(Person))).scalars().all()]
    assert "Backup Tester" in namen
    assert (uploads / "logo.png").read_bytes() == b"PNGDATA"


@pytest.mark.asyncio
async def test_falsche_passphrase(db, tmp_path, monkeypatch):
    ziel = await _setup_ziel(db, tmp_path)
    monkeypatch.setattr(backup_service.settings, "upload_dir", str(tmp_path / "u"))
    backup = await backup_service.erstelle_backup(db)
    blob = (ziel / backup.dateiname).read_bytes()
    with pytest.raises(backup_service.BackupFehler):
        backup_service.analysiere(blob, "falsch")


@pytest.mark.asyncio
async def test_retention_loescht_aelteste(db, tmp_path, monkeypatch):
    ziel = await _setup_ziel(db, tmp_path)
    monkeypatch.setattr(backup_service.settings, "upload_dir", str(tmp_path / "u"))
    await config_service.set(db, "backup_max_anzahl", 2)
    # Drei Backups mit unterschiedlichen Dateinamen (Zeitstempel) erzeugen.
    namen = ["geratehaus-backup-20260101-000001.ghb",
             "geratehaus-backup-20260102-000001.ghb",
             "geratehaus-backup-20260103-000001.ghb"]
    ziel.mkdir(parents=True, exist_ok=True)
    for n in namen:
        (ziel / n).write_bytes(b"x")
    # Retention über das lokale Ziel anwenden.
    lokal = backup_service.LokalesZiel(str(ziel))
    await backup_service._retention(db, lokal)
    verbleibend = await lokal.liste()
    assert verbleibend == namen[1:]  # älteste gelöscht


@pytest.mark.asyncio
async def test_fehler_ohne_ziel_meldet_und_mailt(db, tmp_path, monkeypatch):
    monkeypatch.setattr(backup_service.settings, "upload_dir", str(tmp_path / "u"))
    await config_service.set(db, "backup_lokal_aktiv", False)
    await config_service.set(db, "backup_webdav_aktiv", False)
    await config_service.set(db, "backup_fehler_mail_aktiv", True)
    await config_service.set(db, "notifier_email_recipients", "admin@x.de")
    await config_service.set(db, "backup_passphrase", "geheim123")

    gesendet: list[str] = []

    async def fake_send(self, db, empfaenger, betreff, nachricht):
        gesendet.append(empfaenger)

    monkeypatch.setattr(backup_service.EmailNotifier, "send_an", fake_send)

    with pytest.raises(backup_service.BackupFehler):
        await backup_service.erstelle_backup(db)

    from app.models.backup import Backup

    letzter = (await db.execute(select(Backup).order_by(Backup.id.desc()))).scalars().first()
    assert letzter is not None and letzter.status == "fehler"
    assert gesendet == ["admin@x.de"]
