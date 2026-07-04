from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class BackupOut(BaseModel):
    """Metadaten eines Backups für den Browser."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    dateiname: str
    groesse_bytes: int
    ziele: str
    ausloeser: str
    status: str
    fehlermeldung: str | None
    verschluesselt: bool
    zusammenfassung: dict
    erstellt_am: datetime
    # Ob die Datei im (ersten) lokalen Ziel noch physisch vorhanden ist.
    datei_vorhanden: bool = True


class BackupEinstellungen(BaseModel):
    zeit_stunde: int = Field(ge=0, le=23)
    zeit_minute: int = Field(ge=0, le=59)
    wochentage: list[int]  # 0=Mo … 6=So
    max_anzahl: int = Field(ge=1, le=999)
    passphrase_gesetzt: bool
    lokal_aktiv: bool
    lokal_pfad: str
    webdav_aktiv: bool
    webdav_url: str
    webdav_user: str
    webdav_passwort_gesetzt: bool
    webdav_pfad: str
    fehler_mail_aktiv: bool
    # S3-kompatibel (PR 2)
    s3_aktiv: bool
    s3_endpoint: str
    s3_region: str
    s3_bucket: str
    s3_access_key: str
    s3_secret_gesetzt: bool
    s3_pfad: str
    # SFTP (PR 2)
    sftp_aktiv: bool
    sftp_host: str
    sftp_port: int
    sftp_user: str
    sftp_passwort_gesetzt: bool
    sftp_pfad: str
    # E-Mail-Versand (PR 2)
    email_aktiv: bool
    # PDF-Archiv (PR 2)
    pdf_archiv_aktiv: bool
    pdf_archiv_pfad: str


class BackupEinstellungenUpdate(BaseModel):
    zeit_stunde: int | None = Field(default=None, ge=0, le=23)
    zeit_minute: int | None = Field(default=None, ge=0, le=59)
    wochentage: list[int] | None = None
    max_anzahl: int | None = Field(default=None, ge=1, le=999)
    # Nur setzen, wenn nicht None – leerer String löscht die Passphrase bewusst.
    passphrase: str | None = None
    lokal_aktiv: bool | None = None
    lokal_pfad: str | None = None
    webdav_aktiv: bool | None = None
    webdav_url: str | None = None
    webdav_user: str | None = None
    webdav_passwort: str | None = None
    webdav_pfad: str | None = None
    fehler_mail_aktiv: bool | None = None
    s3_aktiv: bool | None = None
    s3_endpoint: str | None = None
    s3_region: str | None = None
    s3_bucket: str | None = None
    s3_access_key: str | None = None
    s3_secret_key: str | None = None
    s3_pfad: str | None = None
    sftp_aktiv: bool | None = None
    sftp_host: str | None = None
    sftp_port: int | None = None
    sftp_user: str | None = None
    sftp_passwort: str | None = None
    sftp_pfad: str | None = None
    email_aktiv: bool | None = None
    pdf_archiv_aktiv: bool | None = None
    pdf_archiv_pfad: str | None = None


class BackupKategorie(BaseModel):
    key: str
    label: str
    anzahl: int  # Datensätze (bzw. Dateien) in dieser Kategorie im Backup


class BackupAnalyse(BaseModel):
    """Ergebnis der Analyse einer hochgeladenen Backup-Datei (kein Import)."""

    token: str  # Referenz auf die temporär entschlüsselte Datei
    erstellt_am: str | None
    app_version: str | None
    kategorien: list[BackupKategorie]


class BackupImportAnfrage(BaseModel):
    token: str
    kategorien: list[str]  # zu importierende Kategorie-Keys ("alles" = alle)
    modus: Literal["ersetzen", "zusammenfuehren"]


class BackupImportErgebnis(BaseModel):
    importierte_kategorien: list[str]
    importierte_datensaetze: int
    importierte_dateien: int
