"""Tests fürs Backup-Modul: Export/Verschlüsselung, Analyse, Roundtrip-Import,
Retention und Fehlerpfad."""

import io
import json
import zipfile
from datetime import date, time
from pathlib import Path

import pytest
from sqlalchemy import select

from app.models.dienstbuch_planer import DienstbuchPlanTermin
from app.models.person import Person
from app.schemas.dienstbuch_planer import PlanTerminAnlegen
from app.services import backup_service, dienstbuch_planer_service
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
async def test_backup_sichert_verschachtelte_upload_unterordner(db, tmp_path, monkeypatch):
    """Formular-Uploads und Personenbilder liegen in Unterordnern
    (uploads/formulare/…, uploads/personen/…), nicht flach im upload_dir wie im
    obigen Logo-Test. Regression zur Nutzerfrage "wird wirklich ALLES per
    Backup gesichert?" (25.08.2026): rglob() im Export/das rekonstruierte
    Verzeichnis im Import müssen auch beliebig tiefe Unterordner erfassen."""
    ziel = await _setup_ziel(db, tmp_path)
    uploads = tmp_path / "uploads"
    (uploads / "formulare").mkdir(parents=True)
    (uploads / "formulare" / "einreichung-1.pdf").write_bytes(b"PDFDATA")
    (uploads / "personen").mkdir(parents=True)
    (uploads / "personen" / "42.jpg").write_bytes(b"JPGDATA")
    monkeypatch.setattr(backup_service.settings, "upload_dir", str(uploads))

    backup = await backup_service.erstelle_backup(db, ausloeser="manuell")
    blob = (ziel / backup.dateiname).read_bytes()
    token, _manifest, kategorien = backup_service.analysiere(blob, "geheim123")
    dateien = next(k for k in kategorien if k["key"] == "dateien")
    assert dateien["anzahl"] == 2

    (uploads / "formulare" / "einreichung-1.pdf").unlink()
    (uploads / "personen" / "42.jpg").unlink()

    ergebnis = await backup_service.importiere(db, token, ["dateien"], "ersetzen")
    assert ergebnis["importierte_dateien"] == 2
    assert (uploads / "formulare" / "einreichung-1.pdf").read_bytes() == b"PDFDATA"
    assert (uploads / "personen" / "42.jpg").read_bytes() == b"JPGDATA"


@pytest.mark.asyncio
async def test_backup_sichert_time_spalten_korrekt(db, tmp_path, monkeypatch):
    """Regression: ein per Sentry gemeldeter Produktionsfehler (26.08.2026) –
    jeder geplante Backup-Job schlug fehl (`nicht serialisierbar:
    <class 'datetime.time'>`), seit der Dienstbuch Planer `uhrzeit`/`endzeit`
    als reine `time`-Spalten eingeführt hat. `_json_default` kannte bisher nur
    `datetime`/`date`, nicht das eigenständige `time`. Testet den echten
    Export+Import-Roundtrip mit einer Zeile, die eine `time`-Spalte gesetzt hat."""
    await _setup_ziel(db, tmp_path)
    await dienstbuch_planer_service.termin_anlegen(
        db,
        PlanTerminAnlegen(
            titel="Unterweisung UVV",
            zieldatum=date(2026, 9, 1),
            uhrzeit=time(19, 30),
            endzeit=time(21, 0),
        ),
        "Tester",
    )

    # Export darf nicht mit TypeError crashen (das war der Sentry-Fund).
    zip_bytes, _zusammenfassung = await backup_service._baue_zip(db)
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
        manifest = json.loads(zf.read("manifest.json"))
    assert manifest["tabellen"]  # Manifest wurde geschrieben, Export lief durch

    await db.execute(DienstbuchPlanTermin.__table__.delete())
    await db.commit()

    token = "test-token-time-spalten"
    backup_service._import_cache[token] = zip_bytes
    try:
        await backup_service.importiere(db, token, ["dienstbuch_planer"], "ersetzen")
    finally:
        backup_service._import_cache.pop(token, None)

    wiederhergestellt = (
        await db.execute(select(DienstbuchPlanTermin).where(DienstbuchPlanTermin.titel == "Unterweisung UVV"))
    ).scalar_one()
    assert wiederhergestellt.uhrzeit == time(19, 30)
    assert wiederhergestellt.endzeit == time(21, 0)


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


def test_jede_sicherbare_tabelle_hat_eine_import_kategorie():
    """Regression (25.08.2026): Die Planer-Tabellen wurden zwar exportiert
    (generisch über Base.metadata), aber beim selektiven Import stillschweigend
    ignoriert, weil sie keiner KATEGORIE zugeordnet waren. Dieser Test erzwingt
    die im Docstring dokumentierte Invariante "jede Tabelle (außer backups)
    gehört genau zu einer Kategorie" - neue Module fallen damit sofort auf."""
    from app.services.backup_service import _TABELLE_ZU_KATEGORIE, _sicherbare_tabellen

    ohne_kategorie = [t.name for t in _sicherbare_tabellen() if t.name not in _TABELLE_ZU_KATEGORIE]
    assert ohne_kategorie == [], (
        f"Tabellen ohne Backup-Import-Kategorie: {ohne_kategorie} - in "
        "backup_service.KATEGORIEN ergänzen, sonst gehen sie beim Restore verloren."
    )
