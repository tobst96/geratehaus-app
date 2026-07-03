"""Test für logo_service: Dark-Mode-Logo-Variante wird als eigene Datei
gespeichert (ohne PWA-Icon-Generierung)."""

import base64
from io import BytesIO
from pathlib import Path

import pytest
from starlette.datastructures import Headers, UploadFile

from app.core.config import settings
from app.services import logo_service

_PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
)


def _upload(png: bytes) -> UploadFile:
    return UploadFile(
        file=BytesIO(png),
        filename="logo.png",
        headers=Headers({"content-type": "image/png"}),
    )


@pytest.mark.asyncio
async def test_logo_dark_variante_eigene_datei():
    ziel = Path(settings.upload_dir) / "logo-dark.png"
    ziel.unlink(missing_ok=True)
    try:
        url = await logo_service.logo_speichern(_upload(_PNG), variante="logo-dark")
        assert url == "/uploads/logo-dark.png"
        assert ziel.exists()
        assert ziel.read_bytes() == _PNG
    finally:
        ziel.unlink(missing_ok=True)


@pytest.mark.asyncio
async def test_logo_variante_ungueltig_abgelehnt():
    from fastapi import HTTPException

    with pytest.raises(HTTPException):
        await logo_service.logo_speichern(_upload(_PNG), variante="fremd")
