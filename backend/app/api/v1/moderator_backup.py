from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile, status
from sqlalchemy import select

from app.api.deps import CurrentAdmin, DbSession
from app.models.backup import Backup
from app.schemas.backup import (
    BackupAnalyse,
    BackupEinstellungen,
    BackupEinstellungenUpdate,
    BackupImportAnfrage,
    BackupImportErgebnis,
    BackupKategorie,
    BackupOut,
)
from app.services import backup_service, feature_modul_service
from app.services.backup_service import BackupFehler
from app.services.config_service import config_service

# Immer aktives internes Modul, aber rein administrativ.
router = APIRouter(prefix="/moderator/backup", tags=["moderator:backup"])


def _wochentage_liste(roh: str) -> list[int]:
    return [int(x) for x in str(roh).split(",") if x.strip().isdigit()]


@router.get("/einstellungen", response_model=BackupEinstellungen)
async def einstellungen_lesen(db: DbSession, _admin: CurrentAdmin) -> BackupEinstellungen:
    g = config_service.get
    return BackupEinstellungen(
        zeit_stunde=int(await g(db, "backup_zeit_stunde", 3)),
        zeit_minute=int(await g(db, "backup_zeit_minute", 0)),
        wochentage=_wochentage_liste(await g(db, "backup_wochentage", "0,1,2,3,4,5,6")),
        max_anzahl=int(await g(db, "backup_max_anzahl", 7)),
        passphrase_gesetzt=bool(str(await g(db, "backup_passphrase", ""))),
        lokal_aktiv=bool(await g(db, "backup_lokal_aktiv", True)),
        lokal_pfad=str(await g(db, "backup_lokal_pfad", "/app/backups")),
        webdav_aktiv=bool(await g(db, "backup_webdav_aktiv", False)),
        webdav_url=str(await g(db, "backup_webdav_url", "")),
        webdav_user=str(await g(db, "backup_webdav_user", "")),
        webdav_passwort_gesetzt=bool(str(await g(db, "backup_webdav_passwort", ""))),
        webdav_pfad=str(await g(db, "backup_webdav_pfad", "geratehaus-backups")),
        fehler_mail_aktiv=bool(await g(db, "backup_fehler_mail_aktiv", False)),
        s3_aktiv=bool(await g(db, "backup_s3_aktiv", False)),
        s3_endpoint=str(await g(db, "backup_s3_endpoint", "")),
        s3_region=str(await g(db, "backup_s3_region", "us-east-1")),
        s3_bucket=str(await g(db, "backup_s3_bucket", "")),
        s3_access_key=str(await g(db, "backup_s3_access_key", "")),
        s3_secret_gesetzt=bool(str(await g(db, "backup_s3_secret_key", ""))),
        s3_pfad=str(await g(db, "backup_s3_pfad", "backups")),
        sftp_aktiv=bool(await g(db, "backup_sftp_aktiv", False)),
        sftp_host=str(await g(db, "backup_sftp_host", "")),
        sftp_port=int(await g(db, "backup_sftp_port", 22)),
        sftp_user=str(await g(db, "backup_sftp_user", "")),
        sftp_passwort_gesetzt=bool(str(await g(db, "backup_sftp_passwort", ""))),
        sftp_pfad=str(await g(db, "backup_sftp_pfad", "geratehaus-backups")),
        email_aktiv=bool(await g(db, "backup_email_aktiv", False)),
        pdf_archiv_aktiv=bool(await g(db, "backup_pdf_archiv_aktiv", False)),
        pdf_archiv_pfad=str(await g(db, "backup_pdf_archiv_pfad", "pdfs")),
        minio_aktiv=bool(await g(db, "backup_minio_aktiv", False)),
        minio_modul_aktiv=await feature_modul_service.ist_aktiv(db, "minio"),
    )


@router.patch("/einstellungen", response_model=BackupEinstellungen)
async def einstellungen_setzen(
    db: DbSession, _admin: CurrentAdmin, daten: BackupEinstellungenUpdate
) -> BackupEinstellungen:
    s = config_service.set
    if daten.zeit_stunde is not None:
        await s(db, "backup_zeit_stunde", daten.zeit_stunde)
    if daten.zeit_minute is not None:
        await s(db, "backup_zeit_minute", daten.zeit_minute)
    if daten.wochentage is not None:
        await s(db, "backup_wochentage", ",".join(str(t) for t in sorted(set(daten.wochentage)) if 0 <= t <= 6))
    if daten.max_anzahl is not None:
        await s(db, "backup_max_anzahl", daten.max_anzahl)
    if daten.passphrase is not None:
        await s(db, "backup_passphrase", daten.passphrase)
    if daten.lokal_aktiv is not None:
        await s(db, "backup_lokal_aktiv", daten.lokal_aktiv)
    if daten.lokal_pfad is not None:
        await s(db, "backup_lokal_pfad", daten.lokal_pfad)
    if daten.webdav_aktiv is not None:
        await s(db, "backup_webdav_aktiv", daten.webdav_aktiv)
    if daten.webdav_url is not None:
        await s(db, "backup_webdav_url", daten.webdav_url)
    if daten.webdav_user is not None:
        await s(db, "backup_webdav_user", daten.webdav_user)
    if daten.webdav_passwort is not None:
        await s(db, "backup_webdav_passwort", daten.webdav_passwort)
    if daten.webdav_pfad is not None:
        await s(db, "backup_webdav_pfad", daten.webdav_pfad)
    if daten.fehler_mail_aktiv is not None:
        await s(db, "backup_fehler_mail_aktiv", daten.fehler_mail_aktiv)
    for feld, key in [
        (daten.s3_aktiv, "backup_s3_aktiv"), (daten.s3_endpoint, "backup_s3_endpoint"),
        (daten.s3_region, "backup_s3_region"), (daten.s3_bucket, "backup_s3_bucket"),
        (daten.s3_access_key, "backup_s3_access_key"), (daten.s3_secret_key, "backup_s3_secret_key"),
        (daten.s3_pfad, "backup_s3_pfad"), (daten.sftp_aktiv, "backup_sftp_aktiv"),
        (daten.sftp_host, "backup_sftp_host"), (daten.sftp_port, "backup_sftp_port"),
        (daten.sftp_user, "backup_sftp_user"), (daten.sftp_passwort, "backup_sftp_passwort"),
        (daten.sftp_pfad, "backup_sftp_pfad"), (daten.email_aktiv, "backup_email_aktiv"),
        (daten.pdf_archiv_aktiv, "backup_pdf_archiv_aktiv"), (daten.pdf_archiv_pfad, "backup_pdf_archiv_pfad"),
        (daten.minio_aktiv, "backup_minio_aktiv"),
    ]:
        if feld is not None:
            await s(db, key, feld)
    return await einstellungen_lesen(db, _admin)


@router.get("/liste", response_model=list[BackupOut])
async def liste(db: DbSession, _admin: CurrentAdmin) -> list[BackupOut]:
    rows = (await db.execute(select(Backup).order_by(Backup.erstellt_am.desc()))).scalars().all()
    ergebnis: list[BackupOut] = []
    for b in rows:
        out = BackupOut.model_validate(b)
        out.datei_vorhanden = b.status == "ok" and await backup_service.datei_vorhanden(db, b.dateiname)
        ergebnis.append(out)
    return ergebnis


@router.get("/kategorien", response_model=list[BackupKategorie])
async def kategorien(_admin: CurrentAdmin) -> list[BackupKategorie]:
    return [BackupKategorie(key=k, label=label, anzahl=0) for k, label, _ in backup_service.KATEGORIEN]


@router.post("/jetzt", response_model=BackupOut, status_code=status.HTTP_201_CREATED)
async def jetzt_sichern(db: DbSession, _admin: CurrentAdmin) -> BackupOut:
    try:
        backup = await backup_service.erstelle_backup(db, ausloeser="manuell")
    except BackupFehler as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc))
    out = BackupOut.model_validate(backup)
    out.datei_vorhanden = True
    return out


async def _backup_oder_404(db: DbSession, backup_id: int) -> Backup:
    backup = (await db.execute(select(Backup).where(Backup.id == backup_id))).scalar_one_or_none()
    if backup is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Backup nicht gefunden.")
    return backup


@router.get("/{backup_id}/download")
async def download(db: DbSession, _admin: CurrentAdmin, backup_id: int) -> Response:
    backup = await _backup_oder_404(db, backup_id)
    try:
        daten = await backup_service.datei_lesen(db, backup)
    except BackupFehler as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    return Response(
        content=daten,
        media_type="application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{backup.dateiname}"'},
    )


@router.delete("/{backup_id}", status_code=status.HTTP_204_NO_CONTENT)
async def loeschen(db: DbSession, _admin: CurrentAdmin, backup_id: int) -> None:
    backup = await _backup_oder_404(db, backup_id)
    await backup_service.backup_loeschen(db, backup)


@router.post("/analysieren", response_model=BackupAnalyse)
async def analysieren(
    db: DbSession,
    _admin: CurrentAdmin,
    datei: Annotated[UploadFile, File()],
    passphrase: Annotated[str | None, Form()] = None,
) -> BackupAnalyse:
    blob = await datei.read()
    pw = passphrase if passphrase else str(await config_service.get(db, "backup_passphrase", ""))
    try:
        token, manifest, kategorien = backup_service.analysiere(blob, pw)
    except BackupFehler as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    return BackupAnalyse(
        token=token,
        erstellt_am=manifest.get("erstellt_am"),
        app_version=manifest.get("app_version"),
        kategorien=[BackupKategorie(**k) for k in kategorien],
    )


@router.post("/importieren", response_model=BackupImportErgebnis)
async def importieren(
    db: DbSession, _admin: CurrentAdmin, daten: BackupImportAnfrage
) -> BackupImportErgebnis:
    try:
        ergebnis = await backup_service.importiere(db, daten.token, daten.kategorien, daten.modus)
    except BackupFehler as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    return BackupImportErgebnis(**ergebnis)
