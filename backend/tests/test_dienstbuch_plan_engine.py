"""Unit-Tests für die Wiederholungs-Engine des Dienstbuch-Planers - bewusst
ohne DB (reine Funktionen, siehe dienstbuch_plan_engine.py)."""

from datetime import date

import pytest

from app.services.dienstbuch_plan_engine import (
    VorlageRegel,
    VorlageValidierungsFehler,
    berechne_kandidaten,
    naechstes_gueltiges_datum,
    validiere_regel,
)


def test_jaehrlich_uvv_beispiel_mehrere_jahre():
    """„Unterweisung UVV, immer KW 5, Mittwoch, ungerade Woche" - KW 5 ist
    rechnerisch immer ungerade, die Angabe ist also konsistent/redundant und
    liefert in jedem Jahr exakt denselben, direkt berechenbaren Tag."""
    regel = VorlageRegel(
        wiederholungstyp="jaehrlich",
        startdatum=date(2020, 1, 1),
        wochentag=2,  # Mittwoch
        kalenderwoche=5,
        kw_paritaet="ungerade",
    )
    erwartet = {
        2025: date(2025, 1, 29),
        2026: date(2026, 1, 28),
        2027: date(2027, 2, 3),
        2028: date(2028, 2, 2),
    }
    for jahr, datum in erwartet.items():
        kandidaten = berechne_kandidaten(regel, jahr)
        assert kandidaten == [(datum, False)]
        assert datum.isocalendar()[1] == 5
        assert datum.weekday() == 2


def test_jaehrlich_widerspruechliche_paritaet_wird_abgelehnt():
    """KW 5 ist ungerade - eine als "gerade" konfigurierte Vorlage ist ein
    Konfigurationsfehler und wird schon bei der Validierung abgelehnt, statt
    später eine falsche Instanz zu erzeugen (siehe Annahme A2 im Plan)."""
    regel = VorlageRegel(
        wiederholungstyp="jaehrlich",
        startdatum=date(2020, 1, 1),
        wochentag=2,
        kalenderwoche=5,
        kw_paritaet="gerade",
    )
    with pytest.raises(VorlageValidierungsFehler):
        validiere_regel(regel)


def test_jaehrlich_ohne_kalenderwoche_oder_wochentag_ungueltig():
    with pytest.raises(VorlageValidierungsFehler):
        validiere_regel(VorlageRegel(wiederholungstyp="jaehrlich", startdatum=date(2025, 1, 1)))


def test_naechstes_gueltiges_datum_verschiebt_bei_falscher_paritaet():
    # KW 2 2027 ist gerade (falsch), KW 3 2027 ist ungerade (richtig) -
    # bei Mittwoch als Wochentag ist die nächste passende Woche +7 Tage weg.
    kandidat = date(2027, 1, 13)  # Mittwoch, KW2 2027 (gerade)
    assert kandidat.isocalendar()[1] == 2
    ergebnis, verschoben = naechstes_gueltiges_datum(kandidat, wochentag=2, kw_paritaet="ungerade")
    assert verschoben is True
    assert ergebnis == date(2027, 1, 20)
    assert ergebnis.isocalendar()[1] == 3


def test_naechstes_gueltiges_datum_ohne_bedingungen_unveraendert():
    kandidat = date(2027, 1, 13)
    ergebnis, verschoben = naechstes_gueltiges_datum(kandidat, wochentag=None, kw_paritaet=None)
    assert ergebnis == kandidat
    assert verschoben is False


def test_alle_x_wochen_biwoechentlich_ueber_53_wochen_jahr_korrigiert_drift():
    """2026 hat 53 ISO-Kalenderwochen - eine starre 14-Tage-Schrittfolge ab
    einem ungerade-Wochen-Mittwoch würde ab 2027 auf gerade Wochen driften
    (siehe Recherche zum Plan). Die Engine korrigiert jeden Jahreskandidaten
    gegen die tatsächliche Parität statt den Drift durchzureichen."""
    regel = VorlageRegel(
        wiederholungstyp="alle_x_wochen",
        startdatum=date(2025, 1, 29),  # KW5 2025, Mittwoch, ungerade
        intervall=2,
        wochentag=2,
        kw_paritaet="ungerade",
    )
    for jahr, kandidaten in [
        (2025, berechne_kandidaten(regel, 2025)),
        (2026, berechne_kandidaten(regel, 2026)),
        (2027, berechne_kandidaten(regel, 2027)),
    ]:
        assert kandidaten, f"keine Kandidaten für {jahr}"
        for datum, _verschoben in kandidaten:
            assert datum.year == jahr
            assert datum.weekday() == 2
            assert datum.isocalendar()[1] % 2 == 1, f"{datum} ist keine ungerade KW"

    # Die unkorrigierte Rohfolge (feste 14-Tage-Schritte) würde 2027 auf den
    # 13.01. (gerade KW2) fallen - die Engine muss stattdessen auf eine
    # ungerade Woche korrigieren und das als Verschiebung markieren.
    kandidaten_2027 = berechne_kandidaten(regel, 2027)
    erster = min(kandidaten_2027, key=lambda kv: kv[0])
    assert erster[0] != date(2027, 1, 13)
    assert any(verschoben for _datum, verschoben in kandidaten_2027)


def test_alle_x_wochen_ohne_paritaet_regelmaessiger_wochenabstand():
    regel = VorlageRegel(
        wiederholungstyp="alle_x_wochen", startdatum=date(2026, 1, 7), intervall=1, wochentag=2
    )
    kandidaten = berechne_kandidaten(regel, 2026)
    daten = [d for d, _ in kandidaten]
    assert all(d.weekday() == 2 for d in daten)
    assert all(d.year == 2026 for d in daten)
    # 52 oder 53 Mittwoche in einem Jahr, je nach Lage - grob plausibilisieren.
    assert 51 <= len(daten) <= 53
    assert daten == sorted(daten)
    assert len(daten) == len(set(daten))


def test_alle_x_wochen_startdatum_muss_auf_wochentag_fallen():
    regel = VorlageRegel(
        wiederholungstyp="alle_x_wochen",
        startdatum=date(2026, 1, 8),  # Donnerstag, nicht Mittwoch
        intervall=1,
        wochentag=2,
    )
    with pytest.raises(VorlageValidierungsFehler):
        validiere_regel(regel)


def test_alle_x_monate_halbjaehrlich():
    regel = VorlageRegel(wiederholungstyp="alle_x_monate", startdatum=date(2024, 3, 15), intervall=6)
    kandidaten = [d for d, _ in berechne_kandidaten(regel, 2026)]
    assert kandidaten == [date(2026, 3, 15), date(2026, 9, 15)]


def test_alle_x_jahre():
    regel = VorlageRegel(wiederholungstyp="alle_x_jahre", startdatum=date(2020, 6, 1), intervall=3)
    assert [d for d, _ in berechne_kandidaten(regel, 2026)] == [date(2026, 6, 1)]
    assert berechne_kandidaten(regel, 2025) == []


def test_alle_x_tage():
    regel = VorlageRegel(wiederholungstyp="alle_x_tage", startdatum=date(2026, 1, 1), intervall=100)
    kandidaten = [d for d, _ in berechne_kandidaten(regel, 2026)]
    assert kandidaten == [date(2026, 1, 1), date(2026, 4, 11), date(2026, 7, 20), date(2026, 10, 28)]


def test_monatlich_erster_passender_wochentag_pro_monat():
    regel = VorlageRegel(wiederholungstyp="monatlich", startdatum=date(2020, 1, 1), wochentag=0)  # Montag
    kandidaten = [d for d, _ in berechne_kandidaten(regel, 2026)]
    assert len(kandidaten) == 12
    assert all(d.weekday() == 0 for d in kandidaten)
    assert [d.month for d in kandidaten] == list(range(1, 13))


def test_startdatum_und_enddatum_begrenzen_kandidaten():
    regel = VorlageRegel(
        wiederholungstyp="jaehrlich",
        startdatum=date(2027, 1, 1),
        wochentag=2,
        kalenderwoche=5,
        kw_paritaet="ungerade",
    )
    assert berechne_kandidaten(regel, 2026) == []  # vor Startdatum

    regel_mit_ende = VorlageRegel(
        wiederholungstyp="jaehrlich",
        startdatum=date(2020, 1, 1),
        enddatum=date(2026, 12, 31),
        wochentag=2,
        kalenderwoche=5,
        kw_paritaet="ungerade",
    )
    assert berechne_kandidaten(regel_mit_ende, 2027) == []  # nach Enddatum


def test_unbekannter_wiederholungstyp_wird_abgelehnt():
    with pytest.raises(VorlageValidierungsFehler):
        validiere_regel(VorlageRegel(wiederholungstyp="woechentlich", startdatum=date(2026, 1, 1)))


def test_intervall_typ_ohne_intervall_ungueltig():
    with pytest.raises(VorlageValidierungsFehler):
        validiere_regel(VorlageRegel(wiederholungstyp="alle_x_wochen", startdatum=date(2026, 1, 1)))
