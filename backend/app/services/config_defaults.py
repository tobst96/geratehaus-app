"""Neutrale Default-Werte für app_config.

Diese Werte sind reine Fallbacks für den Zustand "noch nicht konfiguriert"
bzw. werden vom Setup-Wizard sofort überschrieben. Sie sind explizit NICHT
feuerwehr-spezifisch (z. B. Geofence auf 0,0 statt einer echten Adresse).
"""

from dataclasses import dataclass
from enum import StrEnum


class ConfigTyp(StrEnum):
    STR = "str"
    INT = "int"
    FLOAT = "float"
    BOOL = "bool"
    JSON = "json"


@dataclass(frozen=True)
class ConfigDefault:
    schluessel: str
    wert: str
    typ: ConfigTyp
    beschreibung: str


DEFAULTS: list[ConfigDefault] = [
    # Organisation & Branding
    ConfigDefault("organisation_name", "Meine Feuerwehr", ConfigTyp.STR, "Name der Organisation"),
    ConfigDefault("logo_url", "", ConfigTyp.STR, "URL/Pfad zum hochgeladenen Logo"),
    ConfigDefault("farbe_primaer", "#FFA633", ConfigTyp.STR, "Primärfarbe (Hex)"),
    ConfigDefault("farbe_akzent", "#1A1A1A", ConfigTyp.STR, "Akzentfarbe (Hex)"),
    # Module
    ConfigDefault("modul_einsatztagebuch_aktiv", "true", ConfigTyp.BOOL, "Einsatztagebuch aktiv"),
    ConfigDefault("modul_dienstbuch_aktiv", "true", ConfigTyp.BOOL, "Dienstbuch aktiv"),
    ConfigDefault("modul_dienststunden_aktiv", "true", ConfigTyp.BOOL, "Dienststunden aktiv"),
    ConfigDefault("modul_fahrzeugbuchung_aktiv", "true", ConfigTyp.BOOL, "Fahrzeugbuchung aktiv"),
    # Sichtbarkeit der Kachel auf der Kiosk-Startseite (unabhängig von "aktiv",
    # das nur steuert, ob das Modul überhaupt erreichbar ist)
    ConfigDefault(
        "modul_einsatztagebuch_startseite", "true", ConfigTyp.BOOL, "Einsatztagebuch auf Startseite anzeigen"
    ),
    ConfigDefault(
        "modul_dienstbuch_startseite", "true", ConfigTyp.BOOL, "Dienstbuch auf Startseite anzeigen"
    ),
    ConfigDefault(
        "modul_dienststunden_startseite", "true", ConfigTyp.BOOL, "Dienststunden auf Startseite anzeigen"
    ),
    ConfigDefault(
        "modul_fahrzeugbuchung_startseite",
        "false",
        ConfigTyp.BOOL,
        "Fahrzeugbuchung auf Startseite anzeigen",
    ),
    # Einsatztagebuch
    ConfigDefault(
        "einsatz_countdown_minuten",
        "30",
        ConfigTyp.INT,
        "Minuten bis die Garage-Ansicht eines Einsatzes ohne Aktivität automatisch schließt",
    ),
    # Divera 24/7
    ConfigDefault("divera_aktiv", "false", ConfigTyp.BOOL, "Divera-Anbindung aktiv"),
    ConfigDefault("divera_api_key", "", ConfigTyp.STR, "Divera Accesskey/API-Key"),
    ConfigDefault("divera_modus", "polling", ConfigTyp.STR, "Divera-Modus: polling oder webhook"),
    # Geofence
    ConfigDefault("geofence_lat", "0.0", ConfigTyp.FLOAT, "Breitengrad des Gerätehauses"),
    ConfigDefault("geofence_lon", "0.0", ConfigTyp.FLOAT, "Längengrad des Gerätehauses"),
    ConfigDefault("geofence_radius_meter", "150", ConfigTyp.FLOAT, "Geofence-Radius in Metern"),
    # Zeitfenster & Schwellenwerte
    ConfigDefault(
        "dienstbuch_zeitfenster_stunden",
        "12",
        ConfigTyp.INT,
        "Zeitfenster (h) für 'letzte Dienstbücher'",
    ),
    ConfigDefault(
        "archivierungszeitraum_jahre", "2", ConfigTyp.INT, "Archivierungszeitraum in Jahren"
    ),
    # Sicherheit
    ConfigDefault("pin_laenge", "4", ConfigTyp.INT, "Länge des PIN für Außenzugriff"),
    # Benachrichtigungen (Events einzeln an/abschaltbar)
    ConfigDefault(
        "benachrichtigung_neuer_einsatz", "true", ConfigTyp.BOOL, "Benachrichtigung bei neuem Einsatz"
    ),
    ConfigDefault(
        "benachrichtigung_neues_dienstbuch",
        "true",
        ConfigTyp.BOOL,
        "Benachrichtigung bei neuem Dienstbuch",
    ),
    ConfigDefault(
        "benachrichtigung_buchungsanfrage",
        "true",
        ConfigTyp.BOOL,
        "Benachrichtigung bei neuer Buchungsanfrage",
    ),
    ConfigDefault(
        "benachrichtigung_schwellenwert_ueberschreitung",
        "true",
        ConfigTyp.BOOL,
        "Benachrichtigung bei Dienststunden-Schwellenwert-Überschreitung",
    ),
    # Benachrichtigungstexte (Platzhalter siehe Beschreibung)
    ConfigDefault(
        "benachrichtigung_text_neuer_einsatz",
        "Neuer Einsatz erfasst: {titel}",
        ConfigTyp.STR,
        "Text bei neuem Einsatz. Platzhalter: {titel}",
    ),
    ConfigDefault(
        "benachrichtigung_text_neues_dienstbuch",
        "Neues Dienstbuch eröffnet: {titel}",
        ConfigTyp.STR,
        "Text bei neuem Dienstbuch. Platzhalter: {titel}",
    ),
    ConfigDefault(
        "benachrichtigung_text_buchungsanfrage",
        "Neue Buchungsanfrage für {fahrzeug}: {von} bis {bis} ({zweck})",
        ConfigTyp.STR,
        "Text bei neuer Buchungsanfrage. Platzhalter: {fahrzeug}, {von}, {bis}, {zweck}",
    ),
    ConfigDefault(
        "benachrichtigung_text_schwellenwert_ueberschreitung",
        "{person} hat den Schwellenwert für {funktion} überschritten ({summe} von {schwellenwert} Stunden)",
        ConfigTyp.STR,
        "Text bei Schwellenwert-Überschreitung. Platzhalter: {person}, {funktion}, {summe}, {schwellenwert}",
    ),
    # Setup
    ConfigDefault("setup_abgeschlossen", "false", ConfigTyp.BOOL, "Setup-Wizard abgeschlossen"),
]
