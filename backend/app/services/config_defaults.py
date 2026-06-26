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
    ConfigDefault(
        "oeffentliche_basis_url",
        "https://geraetehausapp.feuerwehr-musterstadt.de",
        ConfigTyp.STR,
        "Öffentliche Basis-URL der App, wird für alle QR-Code-Links (Barcode vergessen, "
        "Profilbild-Upload usw.) statt der aktuellen Browser-Adresse verwendet",
    ),
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
    ConfigDefault(
        "einsatz_autoabschluss_stunde",
        "4",
        ConfigTyp.INT,
        "Stunde (0-23), zu der offene Einsätze täglich automatisch abgeschlossen werden",
    ),
    ConfigDefault(
        "einsatz_autoabschluss_inaktivitaet_stunden",
        "4",
        ConfigTyp.INT,
        "Ab wie vielen Stunden seit der letzten Bearbeitung ein offener Einsatz automatisch abgeschlossen wird",
    ),
    ConfigDefault(
        "einsatz_alle_eingetragen_minuten",
        "30",
        ConfigTyp.INT,
        "Minuten bis zum automatischen Abschluss, nachdem im Gerätehaus 'Alle eingetragen' geklickt wurde",
    ),
    # Barcodes
    ConfigDefault(
        "barcode_gueltigkeit_tage",
        "730",
        ConfigTyp.INT,
        "Gültigkeitsdauer neu erzeugter Personen-Barcodes in Tagen",
    ),
    # Personen
    ConfigDefault(
        "personen_sortierung",
        "nachname",
        ConfigTyp.STR,
        "Sortierung der Personenliste: 'nachname' oder 'gruppe_nachname'",
    ),
    # Personen-Inaktivität
    ConfigDefault(
        "personen_inaktivitaet_tage",
        "90",
        ConfigTyp.INT,
        "Tage ohne neuen Timeline-Eintrag, nach denen eine Person automatisch gelöscht wird "
        "(7 Tage vorher kommt eine Warn-Benachrichtigung). 0 = Funktion deaktiviert.",
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
        "dienstbuch_autoschluss_stunde",
        "4",
        ConfigTyp.INT,
        "Stunde (0-23), zu der offene Dienstbücher täglich automatisch geschlossen werden",
    ),
    ConfigDefault(
        "archivierungszeitraum_jahre", "2", ConfigTyp.INT, "Archivierungszeitraum in Jahren"
    ),
    # Benachrichtigungen (Events einzeln an/abschaltbar)
    ConfigDefault(
        "benachrichtigung_neuer_einsatz",
        "true",
        ConfigTyp.BOOL,
        "Benachrichtigung, wenn ein Einsatz abgeschlossen wird",
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
    ConfigDefault(
        "benachrichtigung_person_inaktiv",
        "true",
        ConfigTyp.BOOL,
        "Benachrichtigung, wenn eine inaktive Person bald automatisch gelöscht wird",
    ),
    # Benachrichtigungskanäle (Zugangsdaten, ersetzt frühere .env-Werte)
    ConfigDefault("notifier_telegram_aktiv", "false", ConfigTyp.BOOL, "Telegram-Versand aktiv"),
    ConfigDefault("notifier_telegram_bot_token", "", ConfigTyp.STR, "Telegram Bot-Token"),
    ConfigDefault(
        "notifier_telegram_chat_ids", "", ConfigTyp.STR, "Telegram Chat-IDs, kommagetrennt"
    ),
    ConfigDefault("notifier_email_aktiv", "false", ConfigTyp.BOOL, "E-Mail-Versand aktiv"),
    ConfigDefault(
        "notifier_email_pdf_bei_abschluss",
        "false",
        ConfigTyp.BOOL,
        "PDF-Export automatisch per E-Mail versenden, wenn ein Einsatz abgeschlossen wird",
    ),
    ConfigDefault(
        "notifier_email_pdf_bei_dienstbuch_abschluss",
        "false",
        ConfigTyp.BOOL,
        "PDF-Export automatisch per E-Mail versenden, wenn ein Dienstbuch automatisch geschlossen wird",
    ),
    ConfigDefault("notifier_email_smtp_host", "", ConfigTyp.STR, "SMTP-Server"),
    ConfigDefault("notifier_email_smtp_port", "587", ConfigTyp.INT, "SMTP-Port"),
    ConfigDefault("notifier_email_smtp_user", "", ConfigTyp.STR, "SMTP-Benutzername"),
    ConfigDefault("notifier_email_smtp_password", "", ConfigTyp.STR, "SMTP-Passwort"),
    ConfigDefault("notifier_email_smtp_use_tls", "true", ConfigTyp.BOOL, "SMTP STARTTLS verwenden"),
    ConfigDefault(
        "notifier_email_from", "geratehaus@example.org", ConfigTyp.STR, "Absenderadresse"
    ),
    ConfigDefault(
        "notifier_email_recipients", "", ConfigTyp.STR, "Empfängeradressen, kommagetrennt"
    ),
    ConfigDefault("notifier_webpush_aktiv", "false", ConfigTyp.BOOL, "Web-Push-Versand aktiv"),
    ConfigDefault("notifier_webpush_vapid_public_key", "", ConfigTyp.STR, "VAPID Public Key"),
    ConfigDefault("notifier_webpush_vapid_private_key", "", ConfigTyp.STR, "VAPID Private Key"),
    ConfigDefault(
        "notifier_webpush_vapid_subject",
        "mailto:admin@example.org",
        ConfigTyp.STR,
        "VAPID Subject (mailto:-Adresse)",
    ),
    # Benachrichtigungstexte (Platzhalter siehe Beschreibung)
    ConfigDefault(
        "benachrichtigung_text_neuer_einsatz",
        "Einsatz abgeschlossen: {titel}",
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
        "benachrichtigung_text_buchung_genehmigt",
        "Deine Fahrzeugbuchung für {fahrzeug} ({von} bis {bis}, {zweck}) wurde genehmigt.",
        ConfigTyp.STR,
        "Text bei genehmigter Fahrzeugbuchung (E-Mail an anfragende Person). "
        "Platzhalter: {fahrzeug}, {von}, {bis}, {zweck}",
    ),
    ConfigDefault(
        "benachrichtigung_text_buchung_abgelehnt",
        "Deine Fahrzeugbuchung für {fahrzeug} ({von} bis {bis}, {zweck}) wurde abgelehnt. Grund: {grund}",
        ConfigTyp.STR,
        "Text bei abgelehnter Fahrzeugbuchung (E-Mail an anfragende Person). "
        "Platzhalter: {fahrzeug}, {von}, {bis}, {zweck}, {grund}",
    ),
    ConfigDefault(
        "benachrichtigung_text_schwellenwert_ueberschreitung",
        "{person} hat den Schwellenwert für {funktion} überschritten ({summe} von {schwellenwert} Stunden)",
        ConfigTyp.STR,
        "Text bei Schwellenwert-Überschreitung. Platzhalter: {person}, {funktion}, {summe}, {schwellenwert}",
    ),
    ConfigDefault(
        "benachrichtigung_text_person_inaktiv",
        "{person} war seit {tage_inaktiv} Tagen nicht aktiv und wird in 7 Tagen automatisch gelöscht, "
        "falls keine neue Aktivität erfolgt.",
        ConfigTyp.STR,
        "Text bei Inaktivitäts-Warnung. Platzhalter: {person}, {tage_inaktiv}",
    ),
    # Setup
    ConfigDefault("setup_abgeschlossen", "false", ConfigTyp.BOOL, "Setup-Wizard abgeschlossen"),
]
