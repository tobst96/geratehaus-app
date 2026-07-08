"""Tests für die signierten, kurzlebigen Freischalt-Token geschützter Uploads
(Etappe P3, Phase 2): Profilbilder (`/uploads/personen/…`) sind nur noch mit
gültigem `?token=` abrufbar, das Logo bleibt öffentlich. Der Token bindet den
exakten Pfad und läuft ab.

Der Token schützt personenbezogene Bilder gegen dauerhaften/anonymen Abruf,
falls eine URL einmal bekannt wird (Verlauf, geteilter Link, Logs)."""

from pathlib import Path

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import datei_token
from app.core.config import settings
from app.models.person import Person
from app.services import stammdaten_service

# 1x1-PNG (gültige Datei, damit StaticFiles 200 liefern kann).
_PNG = bytes.fromhex(
    "89504e470d0a1a0a0000000d494844520000000100000001080600000"
    "01f15c4890000000d49444154789c6360000002000154a24f8b0000000049454e44ae426082"
)


# --- Reine Helfer-Logik -----------------------------------------------------


def test_signierte_url_haengt_token_an_geschuetztem_pfad_an():
    url = datei_token.signierte_url("/uploads/personen/abc.jpg")
    assert url.startswith("/uploads/personen/abc.jpg?token=")


def test_signierte_url_schuetzt_auch_formular_dateien():
    url = datei_token.signierte_url("/uploads/formulare/beleg.pdf")
    assert url.startswith("/uploads/formulare/beleg.pdf?token=")


def test_signierte_url_laesst_logo_unveraendert():
    # Logo liegt direkt unter /uploads/ und ist nicht geschützt.
    assert datei_token.signierte_url("/uploads/logo.png") == "/uploads/logo.png"


def test_signierte_url_ignoriert_none_und_fremde_werte():
    assert datei_token.signierte_url(None) is None
    assert datei_token.signierte_url("") == ""
    assert datei_token.signierte_url("https://extern/bild.png") == "https://extern/bild.png"


def test_formular_wert_text_datei_haengt_token_an():
    # CSV-Export/E-Mail-Zeile für eine Datei-Antwort muss einen abrufbaren
    # (tokenisierten) Link enthalten, nicht den nackten – geschützten – Pfad.
    from app.services import formular_service

    txt = formular_service._wert_text("datei", "/uploads/formulare/beleg.pdf")
    assert "/uploads/formulare/beleg.pdf?token=" in txt


def test_pfad_gueltig_nur_fuer_exakten_pfad():
    token = datei_token.signiere_pfad("personen/abc.jpg")
    assert datei_token.pfad_gueltig(token, "personen/abc.jpg") is True
    # Token eines anderen Pfades darf nicht durchrutschen.
    assert datei_token.pfad_gueltig(token, "personen/xyz.jpg") is False
    assert datei_token.pfad_gueltig(None, "personen/abc.jpg") is False
    assert datei_token.pfad_gueltig("manipuliert", "personen/abc.jpg") is False


# --- Auslieferung über den geschützten Mount --------------------------------


def _schreibe(relpfad: str) -> None:
    ziel = Path(settings.upload_dir) / relpfad
    ziel.parent.mkdir(parents=True, exist_ok=True)
    ziel.write_bytes(_PNG)


async def test_profilbild_ohne_token_403(client: AsyncClient):
    _schreibe("personen/token-test.png")
    resp = await client.get("/uploads/personen/token-test.png")
    assert resp.status_code == 403


async def test_profilbild_mit_gueltigem_token_200(client: AsyncClient):
    _schreibe("personen/token-test-ok.png")
    token = datei_token.signiere_pfad("personen/token-test-ok.png")
    resp = await client.get(f"/uploads/personen/token-test-ok.png?token={token}")
    assert resp.status_code == 200
    assert resp.content == _PNG


async def test_profilbild_mit_fremdem_token_403(client: AsyncClient):
    _schreibe("personen/token-test-fremd.png")
    fremd = datei_token.signiere_pfad("personen/anderes.png")
    resp = await client.get(f"/uploads/personen/token-test-fremd.png?token={fremd}")
    assert resp.status_code == 403


async def test_formulardatei_ohne_token_403(client: AsyncClient):
    _schreibe("formulare/beleg-token-test.png")
    resp = await client.get("/uploads/formulare/beleg-token-test.png")
    assert resp.status_code == 403


async def test_formulardatei_mit_gueltigem_token_200(client: AsyncClient):
    _schreibe("formulare/beleg-token-ok.png")
    token = datei_token.signiere_pfad("formulare/beleg-token-ok.png")
    resp = await client.get(f"/uploads/formulare/beleg-token-ok.png?token={token}")
    assert resp.status_code == 200


async def test_logo_bleibt_ohne_token_oeffentlich(client: AsyncClient):
    _schreibe("logo-token-test.png")
    resp = await client.get("/uploads/logo-token-test.png")
    assert resp.status_code == 200


async def test_personen_zu_out_liefert_abrufbaren_token_link(client: AsyncClient, db: AsyncSession):
    # Ende-zu-Ende: gespeicherte Person → tokenisierte URL → tatsächlich abrufbar.
    _schreibe("personen/e2e.png")
    person = Person(name="E2E Person", bild_url="/uploads/personen/e2e.png")
    db.add(person)
    await db.commit()
    await db.refresh(person)

    out = await stammdaten_service.person_zu_out(db, person)
    assert out.bild_url is not None and "?token=" in out.bild_url

    resp = await client.get(out.bild_url)
    assert resp.status_code == 200
