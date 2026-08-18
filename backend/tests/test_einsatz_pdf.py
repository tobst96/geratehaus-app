"""Rendert das Einsatz-PDF-Template (ohne WeasyPrint) und prüft, dass Adresse
und Meldung nur bei Divera-Einsätzen ausgegeben werden."""

from datetime import datetime, timezone
from types import SimpleNamespace

from app.services.pdf_service import _einsatz_teilnahmen_kontext, _env

_BASIS = {
    "organisation_name": "Test-FW",
    "farbe_primaer": "#FFA633",
    "farbe_akzent": "#1A1A1A",
    "logo_data_uri": None,
}


def _render(einsatz, zeige_ohne_barcode: bool = True) -> str:
    return _env.get_template("einsatz.html").render(
        einsatz=einsatz,
        zusatzfelder_anzeige=[],
        zeige_ohne_barcode=zeige_ohne_barcode,
        **_einsatz_teilnahmen_kontext(einsatz),
        **_BASIS,
    )


def _person(**kwargs):
    basis = dict(name="Max Muster", vorname=None, nachname=None)
    basis.update(kwargs)
    return SimpleNamespace(**basis)


def _teilnahme(**kwargs):
    basis = dict(
        person=_person(),
        fahrzeug=None,
        funktion=None,
        nur_geraetehaus=True,
        auf_anfahrt=False,
        vab=False,
        atemschutzminuten=0,
        ohne_barcode=False,
        ohne_pin=False,
        bemerkung=None,
    )
    basis.update(kwargs)
    return SimpleNamespace(**basis)


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


def test_name_zeigt_nachname_vorname_in_einer_zelle():
    t = _teilnahme(person=_person(name="Max Muster", vorname="Max", nachname="Muster"))
    html = _render(_einsatz(teilnahmen=[t]))
    assert "Muster, Max" in html
    assert '<td class="pdf-nowrap">Muster, Max</td>' in html


def test_name_faellt_ohne_gepflegten_nachnamen_auf_vollen_namen_zurueck():
    t = _teilnahme(person=_person(name="Nur Anzeigename", vorname=None, nachname=None))
    html = _render(_einsatz(teilnahmen=[t]))
    assert "Nur Anzeigename" in html
    assert "Nur Anzeigename," not in html


def test_teilnehmer_nach_nachname_sortiert():
    a = _teilnahme(person=_person(name="Anna Ypsilon", vorname="Anna", nachname="Ypsilon"))
    b = _teilnahme(person=_person(name="Bert Anfang", vorname="Bert", nachname="Anfang"))
    html = _render(_einsatz(teilnahmen=[a, b]))
    assert html.index("Anfang, Bert") < html.index("Ypsilon, Anna")


def test_vab_ohne_barcode_ohne_pin_zeigen_x_statt_ja():
    t = _teilnahme(vab=True, ohne_barcode=True, ohne_pin=True)
    html = _render(_einsatz(teilnahmen=[t]))
    assert "<td>X</td>" in html
    assert ">Ja<" not in html


def test_bemerkung_bleibt_unveraendert_und_nicht_nowrap():
    t = _teilnahme(bemerkung="Zeile eins\nZeile zwei")
    html = _render(_einsatz(teilnahmen=[t]))
    assert "Zeile eins" in html
    assert '<td class="pdf-nowrap">Zeile eins' not in html


def test_teilnehmer_nach_funktion_block_gruppiert_und_sortiert():
    gf = _teilnahme(
        person=_person(name="Erika Gruppe", vorname="Erika", nachname="Gruppe"),
        funktion=SimpleNamespace(name="Gruppenführer"),
    )
    masch = _teilnahme(
        person=_person(name="Otto Motor", vorname="Otto", nachname="Motor"),
        funktion=SimpleNamespace(name="Maschinist"),
    )
    ohne = _teilnahme(person=_person(name="Nele Neu", vorname="Nele", nachname="Neu"), funktion=None)
    html = _render(_einsatz(teilnahmen=[gf, masch, ohne]))

    assert "Teilnehmer nach Funktion" in html
    assert "Gruppenführer" in html and "Gruppe, Erika" in html
    assert "Maschinist" in html and "Motor, Otto" in html
    assert "Ohne Funktion" not in html
    # Alphabetisch.
    assert html.index("Gruppenführer") < html.index("Maschinist")
    # Personen ohne Funktion werden im Funktionen-Block nicht extra aufgelistet
    # (sie stehen weiterhin ganz normal in der Haupttabelle).
    funktionen_abschnitt = html[html.index("Teilnehmer nach Funktion") :]
    assert "Neu, Nele" not in funktionen_abschnitt


def test_kein_funktionen_block_wenn_niemand_eine_funktion_hat():
    ohne = _teilnahme(person=_person(name="Nele Neu", vorname="Nele", nachname="Neu"), funktion=None)
    html = _render(_einsatz(teilnahmen=[ohne]))
    assert "Teilnehmer nach Funktion" not in html


def test_kein_funktionen_block_ohne_teilnahmen():
    html = _render(_einsatz(teilnahmen=[]))
    assert "Teilnehmer nach Funktion" not in html


def test_atemschutz_spalte_zeigt_kurzform():
    # „😷" wird von DejaVu Sans (einziger im PDF-Container installierter Font)
    # nicht als erkennbare Maske dargestellt, nur als generisches Platzhalter-
    # Symbol – daher die feuerwehrübliche Abkürzung „PA" statt Icon oder
    # „Atemschutz (min)".
    html = _render(_einsatz(teilnahmen=[]))
    assert "<th>PA (min)</th>" in html
    assert "Atemschutz (min)" not in html


def test_ohne_barcode_spalte_ausgeblendet_wenn_modul_aus():
    t = _teilnahme(ohne_barcode=True)
    html = _render(_einsatz(teilnahmen=[t]), zeige_ohne_barcode=False)
    assert "Ohne Barcode" not in html


def test_ohne_barcode_spalte_sichtbar_wenn_modul_an():
    t = _teilnahme(ohne_barcode=True)
    html = _render(_einsatz(teilnahmen=[t]), zeige_ohne_barcode=True)
    assert "Ohne Barcode" in html


def test_bemerkungen_block_nur_personen_mit_bemerkung_vor_funktionen_block():
    mit = _teilnahme(
        person=_person(name="Anna Bemerkt", vorname="Anna", nachname="Bemerkt"),
        bemerkung="Hat früher gehen müssen",
        funktion=SimpleNamespace(name="Gruppenführer"),
    )
    ohne = _teilnahme(
        person=_person(name="Otto Ohne", vorname="Otto", nachname="Ohne"),
        bemerkung=None,
        funktion=SimpleNamespace(name="Maschinist"),
    )
    html = _render(_einsatz(teilnahmen=[mit, ohne]))

    assert "Bemerkungen" in html
    assert "Bemerkt, Anna" in html
    assert "Hat früher gehen müssen" in html
    # Bemerkungen-Block steht vor dem Funktionen-Block.
    assert html.index("Bemerkungen") < html.index("Teilnehmer nach Funktion")
    # Nur Personen MIT Bemerkung landen im Bemerkungen-Block (Otto hat keine).
    bemerkungen_abschnitt = html[html.index("Bemerkungen") : html.index("Teilnehmer nach Funktion")]
    assert "Otto" not in bemerkungen_abschnitt


def test_kein_bemerkungen_block_wenn_niemand_eine_bemerkung_hat():
    t = _teilnahme(bemerkung=None)
    html = _render(_einsatz(teilnahmen=[t]))
    assert "Bemerkungen" not in html
