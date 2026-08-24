"""Tests für die geschützte/gehärtete Profilbild-Ablage (Etappe P3, Phase 1):
nicht erratbare Dateinamen, Magic-Bytes-Prüfung, EXIF-Entfernung und die
einmalige Backfill-Umbenennung der alten `person-<id>`-Namen."""

from io import BytesIO
from pathlib import Path

import pytest
from fastapi import HTTPException, UploadFile
from PIL import Image

from app.core.config import settings
from app.models.person import Person
from app.services import stammdaten_service


def _jpeg_mit_exif() -> bytes:
    img = Image.new("RGB", (12, 12), "red")
    exif = Image.Exif()
    exif[0x0110] = "TestKamera"  # Model-Tag
    buf = BytesIO()
    img.save(buf, format="JPEG", exif=exif.tobytes())
    return buf.getvalue()


def test_bild_verarbeiten_entfernt_exif():
    roh = _jpeg_mit_exif()
    assert Image.open(BytesIO(roh)).getexif().get(0x0110) == "TestKamera"
    bereinigt, endung = stammdaten_service._bild_verarbeiten(roh)
    assert endung == ".jpg"
    assert dict(Image.open(BytesIO(bereinigt)).getexif()) == {}


def test_bild_verarbeiten_verkleinert_grosse_bilder():
    # Ein Profilbild wird nur klein angezeigt - ein hochauflösendes Handyfoto
    # (hier 2000px) soll auf die konfigurierte Maximalkante herunterskaliert werden.
    buf = BytesIO()
    Image.new("RGB", (2000, 1000), "blue").save(buf, format="JPEG")
    bereinigt, endung = stammdaten_service._bild_verarbeiten(buf.getvalue())
    assert endung == ".jpg"
    ergebnis = Image.open(BytesIO(bereinigt))
    assert max(ergebnis.size) == stammdaten_service._BILD_MAX_KANTENLAENGE
    assert ergebnis.size == (512, 256)  # Seitenverhältnis 2:1 bleibt erhalten


def test_bild_verarbeiten_laesst_kleine_bilder_unangetastet():
    buf = BytesIO()
    Image.new("RGB", (100, 80), "green").save(buf, format="PNG")
    bereinigt, endung = stammdaten_service._bild_verarbeiten(buf.getvalue())
    assert endung == ".png"
    assert Image.open(BytesIO(bereinigt)).size == (100, 80)


def test_bild_verarbeiten_lehnt_nicht_bild_ab():
    with pytest.raises(HTTPException) as exc:
        stammdaten_service._bild_verarbeiten(b"das ist definitiv kein Bild")
    assert exc.value.status_code == 415


@pytest.mark.asyncio
async def test_person_bild_speichern_nicht_durchzaehlbar(db):
    person = Person(name="Foto Person")
    db.add(person)
    await db.commit()
    await db.refresh(person)

    datei = UploadFile(BytesIO(_jpeg_mit_exif()), filename="p.jpg")
    person = await stammdaten_service.person_bild_speichern(db, person, datei)

    assert person.bild_url.startswith("/uploads/personen/")
    # Kein durchzählbarer person-<id>-Name mehr.
    assert "person-" not in person.bild_url
    pfad = stammdaten_service._upload_pfad_aus_url(person.bild_url)
    assert pfad is not None and pfad.exists()
    # Gespeichertes Bild ohne EXIF.
    assert dict(Image.open(pfad).getexif()) == {}


@pytest.mark.asyncio
async def test_person_bild_ersetzen_loescht_altes(db):
    person = Person(name="Zwei Bilder")
    db.add(person)
    await db.commit()
    await db.refresh(person)

    person = await stammdaten_service.person_bild_speichern(
        db, person, UploadFile(BytesIO(_jpeg_mit_exif()), filename="a.jpg")
    )
    erstes = stammdaten_service._upload_pfad_aus_url(person.bild_url)
    person = await stammdaten_service.person_bild_speichern(
        db, person, UploadFile(BytesIO(_jpeg_mit_exif()), filename="b.jpg")
    )
    zweites = stammdaten_service._upload_pfad_aus_url(person.bild_url)

    assert erstes != zweites
    assert not erstes.exists()  # altes Bild entfernt
    assert zweites.exists()


@pytest.mark.asyncio
async def test_personenbilder_backfill_benennt_um(db):
    person = Person(name="Alt Foto")
    db.add(person)
    await db.commit()
    await db.refresh(person)

    verzeichnis = Path(settings.upload_dir) / "personen"
    verzeichnis.mkdir(parents=True, exist_ok=True)
    alt_datei = verzeichnis / f"person-{person.id}.png"
    Image.new("RGB", (5, 5), "blue").save(alt_datei, format="PNG")
    person.bild_url = f"/uploads/personen/person-{person.id}.png"
    await db.commit()

    umbenannt = await stammdaten_service.personenbilder_backfill(db)
    assert umbenannt == 1
    await db.refresh(person)
    assert "person-" not in person.bild_url
    assert not alt_datei.exists()
    neu = stammdaten_service._upload_pfad_aus_url(person.bild_url)
    assert neu is not None and neu.exists()

    # Idempotent: zweiter Lauf benennt nichts mehr um.
    assert await stammdaten_service.personenbilder_backfill(db) == 0
