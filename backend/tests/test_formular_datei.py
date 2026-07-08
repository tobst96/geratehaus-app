"""Formular-Datei-Uploads: Magic-Bytes-Prüfung (nicht nur Content-Type) und
EXIF-Entfernung bei Bildern (Etappe P3, Datei-Härtung)."""

import io

import pytest
from fastapi import HTTPException
from PIL import Image

from app.services.formular_service import _datei_bereinigen


def _jpeg_mit_exif() -> bytes:
    img = Image.new("RGB", (12, 12), "red")
    exif = img.getexif()
    exif[0x010E] = "geheime Beschreibung"  # ImageDescription (stellvertretend für Metadaten)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", exif=exif.tobytes())
    return buf.getvalue()


def test_jpeg_exif_wird_entfernt():
    roh = _jpeg_mit_exif()
    assert dict(Image.open(io.BytesIO(roh)).getexif())  # EXIF vorhanden
    bereinigt, endung = _datei_bereinigen(roh, "image/jpeg")
    assert endung == ".jpg"
    assert not dict(Image.open(io.BytesIO(bereinigt)).getexif())  # EXIF entfernt


def test_png_wird_akzeptiert():
    buf = io.BytesIO()
    Image.new("RGBA", (10, 10), (0, 0, 0, 0)).save(buf, format="PNG")
    bereinigt, endung = _datei_bereinigen(buf.getvalue(), "image/png")
    assert endung == ".png"
    assert Image.open(io.BytesIO(bereinigt)).format == "PNG"


def test_gefaelschtes_bild_wird_abgelehnt():
    # Content-Type behauptet PNG, Bytes sind aber kein Bild → 415.
    with pytest.raises(HTTPException) as exc:
        _datei_bereinigen(b"das ist kein bild", "image/png")
    assert exc.value.status_code == 415


def test_pdf_magic_bytes():
    assert _datei_bereinigen(b"%PDF-1.7\n%stuff", "application/pdf") == (b"%PDF-1.7\n%stuff", ".pdf")
    with pytest.raises(HTTPException) as exc:
        _datei_bereinigen(b"kein pdf", "application/pdf")
    assert exc.value.status_code == 415
