"""Rendert das Einsatz-PDF-Template (ohne WeasyPrint) und prüft, dass Adresse
und Meldung nur bei Divera-Einsätzen ausgegeben werden."""

from datetime import datetime, timezone
from types import SimpleNamespace

from app.services.pdf_service import _env

_BASIS = {
    "organisation_name": "Test-FW",
    "farbe_primaer": "#FFA633",
    "farbe_akzent": "#1A1A1A",
    "logo_data_uri": None,
}


def _render(einsatz) -> str:
    return _env.get_template("einsatz.html").render(
        einsatz=einsatz, zusatzfelder_anzeige=[], **_BASIS
    )


def _einsatz(**kwargs):
    basis = dict(
        titel="H2",
        quelle="divera",
        status="abgeschlossen",
        zeitpunkt=datetime(2026, 7, 1, 14, 18, tzinfo=timezone.utc),
        adresse="Westerstede, Kanalstraße",
        meldung="PKW im Graben, 2 eingeschlossen",
        teilnahmen=[],
    )
    basis.update(kwargs)
    return SimpleNamespace(**basis)


def test_divera_einsatz_zeigt_adresse_und_meldung():
    html = _render(_einsatz())
    assert "Adresse" in html
    assert "Westerstede, Kanalstraße" in html
    assert "Meldung" in html
    assert "PKW im Graben, 2 eingeschlossen" in html


def test_manueller_einsatz_zeigt_keine_adresse():
    html = _render(_einsatz(quelle="manuell"))
    assert "Westerstede, Kanalstraße" not in html


def test_divera_einsatz_ohne_werte_kein_block():
    html = _render(_einsatz(adresse=None, meldung=None))
    assert "Adresse" not in html
    assert "Meldung" not in html
