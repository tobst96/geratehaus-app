"""Tests für das Modul ELW: Token-Gültigkeit (offen/geschlossen/gefälscht),
Login-loser Upload (Bereinigung + MinIO + Timeline) und die Anlage-Mail."""

import io
from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

import pytest
from PIL import Image
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.einsatz import EinsatzAnlegen
from app.services import einsatz_service, elw_service
from app.services.config_service import config_service


async def _offener_einsatz(db: AsyncSession):
    return await einsatz_service.einsatz_anlegen(
        db, EinsatzAnlegen(titel="B2 Zimmerbrand", zeitpunkt=datetime(2026, 7, 1, 12, 0, tzinfo=timezone.utc))
    )


def _png_bytes() -> bytes:
    puffer = io.BytesIO()
    Image.new("RGB", (4, 4), (200, 30, 30)).save(puffer, format="PNG")
    return puffer.getvalue()


@pytest.mark.asyncio
async def test_token_roundtrip_offener_einsatz(db: AsyncSession):
    einsatz = await _offener_einsatz(db)
    token = elw_service.token_erzeugen(einsatz.id)
    info = await elw_service.einsatz_info(db, token)
    assert info["einsatz_id"] == einsatz.id
    assert info["titel"] == "B2 Zimmerbrand"


@pytest.mark.asyncio
async def test_geschlossener_einsatz_sperrt_token(db: AsyncSession):
    einsatz = await _offener_einsatz(db)
    token = elw_service.token_erzeugen(einsatz.id)
    einsatz.status = "abgeschlossen"
    await db.commit()
    with pytest.raises(elw_service.ElwEinsatzGeschlossen):
        await elw_service.einsatz_info(db, token)


@pytest.mark.asyncio
async def test_gefaelschtes_token_abgelehnt(db: AsyncSession):
    with pytest.raises(elw_service.ElwTokenUngueltig):
        await elw_service.einsatz_info(db, "nicht-signiert")


@pytest.mark.asyncio
async def test_upload_speichert_und_protokolliert(db: AsyncSession):
    einsatz = await _offener_einsatz(db)
    token = elw_service.token_erzeugen(einsatz.id)

    with patch("app.services.minio_service.aktiv", new=AsyncMock(return_value=True)), patch(
        "app.services.minio_service.einsatz_upload_ablegen", new=AsyncMock()
    ) as mock_ablegen:
        name = await elw_service.upload_verarbeiten(
            db, token, "Bericht.png", _png_bytes(), "image/png"
        )

    assert name.endswith(".png")
    mock_ablegen.assert_awaited_once()
    ereignisse = await einsatz_service.liste_ereignisse(db, einsatz.id)
    assert any(e.typ == "elw_upload" for e in ereignisse)


@pytest.mark.asyncio
async def test_upload_geschlossen_verweigert(db: AsyncSession):
    einsatz = await _offener_einsatz(db)
    token = elw_service.token_erzeugen(einsatz.id)
    einsatz.status = "abgeschlossen"
    await db.commit()
    with pytest.raises(elw_service.ElwEinsatzGeschlossen):
        await elw_service.upload_verarbeiten(db, token, "x.png", _png_bytes(), "image/png")


@pytest.mark.asyncio
async def test_upload_ohne_minio_klarer_fehler(db: AsyncSession):
    einsatz = await _offener_einsatz(db)
    token = elw_service.token_erzeugen(einsatz.id)
    with patch("app.services.minio_service.aktiv", new=AsyncMock(return_value=False)):
        with pytest.raises(elw_service.ElwFehler):
            await elw_service.upload_verarbeiten(db, token, "x.png", _png_bytes(), "image/png")


@pytest.mark.asyncio
async def test_anlage_mail_bei_aktivem_modul(db: AsyncSession):
    await config_service.set(db, "modul_elw_aktiv", True)
    await config_service.set(db, "elw_email", "elw@example.org")
    await config_service.set(db, "oeffentliche_basis_url", "https://example.org")
    einsatz = await _offener_einsatz(db)

    with patch.object(elw_service.EmailNotifier, "send_an", new=AsyncMock()) as mock_send:
        await elw_service.anlage_mail_senden(db, einsatz)

    mock_send.assert_awaited_once()
    ziel, betreff, nachricht = mock_send.await_args.args[1], mock_send.await_args.args[2], mock_send.await_args.args[3]
    assert ziel == "elw@example.org"
    assert "/elw-upload/" in nachricht


@pytest.mark.asyncio
async def test_anlage_mail_modul_inaktiv_keine_mail(db: AsyncSession):
    await config_service.set(db, "modul_elw_aktiv", False)
    await config_service.set(db, "elw_email", "elw@example.org")
    einsatz = await _offener_einsatz(db)
    with patch.object(elw_service.EmailNotifier, "send_an", new=AsyncMock()) as mock_send:
        await elw_service.anlage_mail_senden(db, einsatz)
    mock_send.assert_not_awaited()


@pytest.mark.asyncio
async def test_api_get_und_upload(client, db: AsyncSession):
    einsatz = await _offener_einsatz(db)
    token = elw_service.token_erzeugen(einsatz.id)

    r = await client.get(f"/api/v1/elw/{token}")
    assert r.status_code == 200
    assert r.json()["einsatz_id"] == einsatz.id

    with patch("app.services.minio_service.aktiv", new=AsyncMock(return_value=True)), patch(
        "app.services.minio_service.einsatz_upload_ablegen", new=AsyncMock()
    ):
        r = await client.post(
            f"/api/v1/elw/{token}/upload",
            files={"datei": ("bericht.png", _png_bytes(), "image/png")},
        )
    assert r.status_code == 200 and r.json()["ok"] is True


@pytest.mark.asyncio
async def test_api_geschlossen_gibt_410(client, db: AsyncSession):
    einsatz = await _offener_einsatz(db)
    token = elw_service.token_erzeugen(einsatz.id)
    einsatz.status = "abgeschlossen"
    await db.commit()
    r = await client.get(f"/api/v1/elw/{token}")
    assert r.status_code == 410
