"""Regression: die Einsatzbericht-Abschluss-Mail enthält den App-internen
MinIO-Link zum Einsatz-Ordner (wenn das MinIO-Modul aktiv ist), damit man aus der
Mail direkt zu den Einsatz-Dokumenten springen kann."""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.einsatz import EinsatzAnlegen
from app.services import einsatz_service
from app.services.notifier.email import EmailNotifier


@pytest.mark.asyncio
async def test_abschluss_mail_enthaelt_minio_ordner_link(db: AsyncSession):
    einsatz = await einsatz_service.einsatz_anlegen(
        db, EinsatzAnlegen(titel="Testeinsatz", zeitpunkt=datetime(2026, 7, 1, 12, 0, tzinfo=timezone.utc))
    )
    link = "https://example.org/gruppenfuehrer/module/minio?bucket=einsaetze&prefix=einsatz-1/"

    with patch.object(
        einsatz_service.pdf_service, "einsatz_pdf", new=AsyncMock(return_value=b"PDF")
    ), patch.object(
        einsatz_service.benachrichtigungskanal_service,
        "mail_empfaenger_fuer_ereignis",
        new=AsyncMock(return_value=["elw@example.org"]),
    ), patch(
        "app.services.minio_service.einsatz_ordner_link", new=AsyncMock(return_value=link)
    ), patch.object(
        EmailNotifier, "pdf_versenden", new=AsyncMock()
    ) as mock_mail:
        await einsatz_service._pdf_versenden_und_drucken(db, einsatz, pdf_mail_aktiv=True)

    mock_mail.assert_awaited_once()
    # nachricht ist das 2. Positionsargument nach db: (db, betreff, nachricht, ...)
    nachricht = mock_mail.await_args.args[2]
    assert link in nachricht


@pytest.mark.asyncio
async def test_abschluss_mail_ohne_minio_kein_link(db: AsyncSession):
    einsatz = await einsatz_service.einsatz_anlegen(
        db, EinsatzAnlegen(titel="Ohne MinIO", zeitpunkt=datetime(2026, 7, 1, 12, 0, tzinfo=timezone.utc))
    )
    with patch.object(
        einsatz_service.pdf_service, "einsatz_pdf", new=AsyncMock(return_value=b"PDF")
    ), patch.object(
        einsatz_service.benachrichtigungskanal_service,
        "mail_empfaenger_fuer_ereignis",
        new=AsyncMock(return_value=["elw@example.org"]),
    ), patch(
        "app.services.minio_service.einsatz_ordner_link", new=AsyncMock(return_value=None)
    ), patch.object(
        EmailNotifier, "pdf_versenden", new=AsyncMock()
    ) as mock_mail:
        await einsatz_service._pdf_versenden_und_drucken(db, einsatz, pdf_mail_aktiv=True)

    nachricht = mock_mail.await_args.args[2]
    assert "Einsatz-Ordner" not in nachricht
