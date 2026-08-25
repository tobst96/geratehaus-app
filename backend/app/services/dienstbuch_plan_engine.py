"""Wiederholungs-Engine für das Modul „Dienstbuch Planer" (Backlog Etappe
Dienstbuch-Planer, Phase 1).

Bewusst reine, ORM-freie Berechnungsfunktionen ohne DB-/Async-Zugriff, damit
die für dieses Modul zentrale (und komplexeste) Logik ohne Datenbank
unit-testbar ist. Kein RRULE: `icalendar`/`recurring_ical_events`
(`externe_termine_service.py`) deckt nur echte iCal-Wiederholungen ab, nicht
die hier geforderte Kalenderwoche/gerade-ungerade/Wochentag-Zusatzbedingung.

Kalenderwochen-Parität (`kw_paritaet`) wird immer frisch aus der echten
ISO-Kalenderwoche des jeweiligen Datums berechnet (`date.isocalendar()`),
nie als fortlaufender Zähler über Jahresgrenzen hinweg - das ist robust
gegenüber 53-Wochen-Jahren, ohne Drift-Tracking zu benötigen.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta

WIEDERHOLUNGSTYPEN = {
    "jaehrlich",
    "monatlich",
    "alle_x_tage",
    "alle_x_wochen",
    "alle_x_monate",
    "alle_x_jahre",
}

_INTERVALL_TYPEN = {"alle_x_tage", "alle_x_wochen", "alle_x_monate", "alle_x_jahre"}

# Sicherheitsnetz gegen Endlosschleifen bei pathologischen Eingaben
# (z. B. sehr altes Startdatum + sehr großes Intervall in die falsche
# Richtung) - deckt für Monats-/Jahres-Intervalle deutlich mehr als ein
# Jahrhundert ab.
_MAX_SCHRITTE = 2000


class VorlageValidierungsFehler(ValueError):
    """Die Wiederholungsregel ist in sich widersprüchlich oder unvollständig."""


@dataclass(frozen=True)
class VorlageRegel:
    """ORM-freie Kopie der wiederholungsrelevanten Felder von
    `DienstbuchPlanVorlage` - entkoppelt die Engine von SQLAlchemy."""

    wiederholungstyp: str
    startdatum: date
    intervall: int | None = None
    wochentag: int | None = None  # 0=Montag..6=Sonntag, wie date.weekday()
    kalenderwoche: int | None = None  # 1-53, nur bei "jaehrlich" verwendet
    kw_paritaet: str | None = None  # "gerade" | "ungerade" | None
    enddatum: date | None = None


def _kw_paritaet_passt(kalenderwoche: int, kw_paritaet: str) -> bool:
    ist_gerade = kalenderwoche % 2 == 0
    return ist_gerade if kw_paritaet == "gerade" else not ist_gerade


def validiere_regel(regel: VorlageRegel) -> None:
    """Wirft `VorlageValidierungsFehler` bei in sich widersprüchlichen
    Angaben. Wichtigster Fall: bei `wiederholungstyp="jaehrlich"` ist die
    Kalenderwoche fix vorgegeben, ihre Parität damit rechnerisch feststehend
    (KW 5 ist z. B. immer ungerade) - eine widersprüchliche `kw_paritaet`
    ist daher ein Konfigurationsfehler, kein Laufzeit-Konflikt, und wird
    hier abgelehnt statt später eine falsche Instanz zu erzeugen."""
    if regel.wiederholungstyp not in WIEDERHOLUNGSTYPEN:
        raise VorlageValidierungsFehler(f"Unbekannter Wiederholungstyp: {regel.wiederholungstyp!r}")

    if regel.wiederholungstyp == "jaehrlich":
        if regel.kalenderwoche is None or regel.wochentag is None:
            raise VorlageValidierungsFehler("„jaehrlich“ braucht Kalenderwoche und Wochentag.")
        if regel.kw_paritaet is not None and not _kw_paritaet_passt(regel.kalenderwoche, regel.kw_paritaet):
            tatsaechlich = "gerade" if regel.kalenderwoche % 2 == 0 else "ungerade"
            raise VorlageValidierungsFehler(
                f"KW {regel.kalenderwoche} ist {tatsaechlich}, widerspricht der angegebenen "
                f"Parität „{regel.kw_paritaet}“."
            )

    if regel.wiederholungstyp in _INTERVALL_TYPEN and (regel.intervall is None or regel.intervall < 1):
        raise VorlageValidierungsFehler(f"„{regel.wiederholungstyp}“ braucht ein Intervall >= 1.")

    if regel.wiederholungstyp == "alle_x_wochen" and regel.wochentag is not None:
        if regel.startdatum.weekday() != regel.wochentag:
            raise VorlageValidierungsFehler("Startdatum muss auf den angegebenen Wochentag fallen.")


def naechstes_gueltiges_datum(
    kandidat: date, wochentag: int | None, kw_paritaet: str | None, richtung: int = 1
) -> tuple[date, bool]:
    """Sucht ab `kandidat` das nächste Datum, das Wochentag- und
    KW-Paritäts-Bedingung (jeweils falls gesetzt) erfüllt. Rückgabe
    `(datum, wurde_verschoben)`. Ist `wochentag` gesetzt, wird in
    Wochenschritten gesucht (der Wochentag bleibt dadurch automatisch
    erhalten), sonst tageweise."""
    if wochentag is None and kw_paritaet is None:
        return kandidat, False

    schritt = timedelta(weeks=1) if wochentag is not None else timedelta(days=1)
    d = kandidat
    verschoben = False
    for _ in range(_MAX_SCHRITTE):
        wochentag_ok = wochentag is None or d.weekday() == wochentag
        paritaet_ok = kw_paritaet is None or _kw_paritaet_passt(d.isocalendar()[1], kw_paritaet)
        if wochentag_ok and paritaet_ok:
            return d, verschoben
        d = d + richtung * schritt
        verschoben = True
    raise VorlageValidierungsFehler("Kein gültiges Datum in angemessener Zeit gefunden.")


def _tage_im_monat(jahr: int, monat: int) -> int:
    if monat == 12:
        return (date(jahr + 1, 1, 1) - date(jahr, 12, 1)).days
    return (date(jahr, monat + 1, 1) - date(jahr, monat, 1)).days


def _monat_addieren(d: date, monate: int) -> date:
    monat_index = d.month - 1 + monate
    jahr = d.year + monat_index // 12
    monat = monat_index % 12 + 1
    tag = min(d.day, _tage_im_monat(jahr, monat))
    return date(jahr, monat, tag)


def _schritt(d: date, typ: str, intervall: int) -> date:
    if typ == "alle_x_tage":
        return d + timedelta(days=intervall)
    if typ == "alle_x_wochen":
        return d + timedelta(weeks=intervall)
    if typ == "alle_x_monate":
        return _monat_addieren(d, intervall)
    if typ == "alle_x_jahre":
        return _monat_addieren(d, intervall * 12)
    raise VorlageValidierungsFehler(f"Kein Schritt-Muster für {typ!r}.")


def _kandidaten_jaehrlich(regel: VorlageRegel, jahr: int) -> list[tuple[date, bool]]:
    assert regel.kalenderwoche is not None and regel.wochentag is not None
    d = date.fromisocalendar(jahr, regel.kalenderwoche, regel.wochentag + 1)
    return [(d, False)]


def _kandidaten_monatlich(regel: VorlageRegel, jahr: int) -> list[tuple[date, bool]]:
    """Ein Kandidat pro Kalendermonat: die erste Woche des Monats, die
    Wochentag/Parität erfüllt (Annahme A3 - nicht „an einem festen
    Kalendertag")."""
    ergebnisse: list[tuple[date, bool]] = []
    for monat in range(1, 13):
        monatsanfang = date(jahr, monat, 1)
        if regel.wochentag is not None:
            versatz = (regel.wochentag - monatsanfang.weekday()) % 7
            kandidat = monatsanfang + timedelta(days=versatz)
        else:
            kandidat = monatsanfang
        d, verschoben = naechstes_gueltiges_datum(kandidat, regel.wochentag, regel.kw_paritaet)
        if d.month == monat and d.year == jahr:
            ergebnisse.append((d, verschoben))
        # Rutscht die Parität-Suche in den Folgemonat, lassen wir den Monat
        # bewusst aus statt einen falschen Monat zu treffen - seltener
        # Randfall bei sehr restriktiven Kombinationen.
    return ergebnisse


def _kandidaten_intervall(regel: VorlageRegel, jahr: int) -> list[tuple[date, bool]]:
    assert regel.intervall is not None
    jahresanfang = date(jahr, 1, 1)
    jahresende = date(jahr, 12, 31)

    d = regel.startdatum
    if d.year < jahr:
        if regel.wiederholungstyp == "alle_x_tage":
            schritt_tage = regel.intervall
        elif regel.wiederholungstyp == "alle_x_wochen":
            schritt_tage = regel.intervall * 7
        else:
            schritt_tage = None

        if schritt_tage is not None:
            # Direkter Sprung nahe ans Zieljahr statt tageweiser Schleife.
            tage_bis_jahr = (jahresanfang - d).days
            spruenge = max(tage_bis_jahr // schritt_tage, 0)
            d = d + timedelta(days=spruenge * schritt_tage)
            while d.year < jahr:
                d = d + timedelta(days=schritt_tage)
        else:
            for _ in range(_MAX_SCHRITTE):
                if d.year >= jahr:
                    break
                d = _schritt(d, regel.wiederholungstyp, regel.intervall)
            else:
                raise VorlageValidierungsFehler("Konnte Zieljahr nicht in angemessener Zeit erreichen.")

    ergebnisse: list[tuple[date, bool]] = []
    schritte = 0
    while d.year <= jahr and schritte < _MAX_SCHRITTE:
        if d.year == jahr:
            kandidat, verschoben = naechstes_gueltiges_datum(d, regel.wochentag, regel.kw_paritaet)
            if kandidat.year == jahr:
                ergebnisse.append((kandidat, verschoben))
        d = _schritt(d, regel.wiederholungstyp, regel.intervall)
        schritte += 1
    return ergebnisse


def berechne_kandidaten(regel: VorlageRegel, jahr: int) -> list[tuple[date, bool]]:
    """Berechnet die Zieldatum-Kandidaten einer Vorlage für ein Kalenderjahr.

    Rückgabe je Kandidat: `(datum, wurde_automatisch_verschoben)` - Letzteres
    zeigt an, dass die Wochentag-/Paritäts-Bedingung eine Verschiebung vom
    rechnerischen Rohdatum erzwungen hat (siehe `naechstes_gueltiges_datum`);
    der Aufrufer sollte das im Audit-Protokoll vermerken.
    """
    validiere_regel(regel)

    if regel.wiederholungstyp == "jaehrlich":
        ergebnisse = _kandidaten_jaehrlich(regel, jahr)
    elif regel.wiederholungstyp == "monatlich":
        ergebnisse = _kandidaten_monatlich(regel, jahr)
    else:
        ergebnisse = _kandidaten_intervall(regel, jahr)

    return [
        (d, verschoben)
        for d, verschoben in ergebnisse
        if d >= regel.startdatum and (regel.enddatum is None or d <= regel.enddatum)
    ]
