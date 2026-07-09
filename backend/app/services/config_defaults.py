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
    ConfigDefault("zeitzone", "Europe/Berlin", ConfigTyp.STR, "Zeitzone für Anzeigen und Uhrzeit-Vergleiche"),
    ConfigDefault("logo_url", "", ConfigTyp.STR, "URL/Pfad zum hochgeladenen Logo"),
    ConfigDefault("logo_url_dark", "", ConfigTyp.STR, "Alternatives Logo für den Dark Mode"),
    ConfigDefault("farbe_primaer", "#FFA633", ConfigTyp.STR, "Primärfarbe (Hex)"),
    ConfigDefault("farbe_akzent", "#1A1A1A", ConfigTyp.STR, "Akzentfarbe (Hex)"),
    # Module
    ConfigDefault("modul_einsatztagebuch_aktiv", "true", ConfigTyp.BOOL, "Einsatztagebuch aktiv"),
    ConfigDefault("modul_dienstbuch_aktiv", "true", ConfigTyp.BOOL, "Dienstbuch aktiv"),
    ConfigDefault("modul_dienststunden_aktiv", "true", ConfigTyp.BOOL, "Dienststunden aktiv"),
    ConfigDefault("modul_fahrzeugbuchung_aktiv", "true", ConfigTyp.BOOL, "Fahrzeugbuchung aktiv"),
    ConfigDefault("modul_formular_aktiv", "false", ConfigTyp.BOOL, "Formular-Modul aktiv"),
    # Divera ist ein Feature-Modul (An/Aus), aber nicht mitgliederseitig – daher
    # keine _startseite/_aussenzugriff-Keys. Steuert, ob der Divera-Bereich
    # (Unterseite + Polling/Personal-Sync) überhaupt verfügbar ist.
    ConfigDefault("modul_divera_aktiv", "false", ConfigTyp.BOOL, "Divera-Modul aktiv"),
    # Einmal-Marker: übernimmt bestehende Divera-Instanzen (divera_aktiv=true) ins
    # neue Divera-Modul (modul_divera_aktiv=true), siehe Lifespan in app/main.py.
    ConfigDefault("modul_divera_migration_done", "false", ConfigTyp.BOOL, "Divera-Modul-Migration erfolgt"),
    # Barcode-Modul: wenn AUS (Default), Login per Namenssuche + PIN statt Barcode-Scan.
    # Nicht mitgliederseitig – daher keine _startseite/_aussenzugriff-Keys.
    ConfigDefault("modul_barcode_aktiv", "false", ConfigTyp.BOOL, "Barcode-Modul aktiv"),
    # Einmal-Marker: bestehende Instanzen mit vorhandenen Barcodes behalten den
    # Barcode-Login (modul_barcode_aktiv=true), siehe Lifespan in app/main.py.
    ConfigDefault("modul_barcode_migration_done", "false", ConfigTyp.BOOL, "Barcode-Modul-Migration erfolgt"),
    # Intervall (Tage) für die Erinnerungsmail an Personen ohne gesetzten PIN
    # (nur relevant, wenn das Barcode-Modul AUS ist). Einstellbar im Modul Personal.
    ConfigDefault("pin_erinnerung_intervall_tage", "7", ConfigTyp.INT, "Intervall (Tage) der PIN-Erinnerungsmail"),
    # Kiosk-Auto-Sperre: nach so vielen Sekunden Inaktivität springt das Kiosk-Tablet
    # zurück zur Kiosk-Startseite (verhindert hängende Sitzungen). 0 = deaktiviert.
    ConfigDefault("kiosk_autolock_sekunden", "0", ConfigTyp.INT, "Kiosk: Sekunden Inaktivität bis Rücksprung zur Startseite (0 = aus)"),
    # Brute-Force-Schutz für den öffentlichen Name+PIN-Login: nach so vielen
    # aufeinanderfolgenden Fehlversuchen wird der PIN-Login der betroffenen Person
    # für die angegebene Dauer gesperrt (0 Fehlversuche = Sperre deaktiviert).
    ConfigDefault("pin_max_fehlversuche", "5", ConfigTyp.INT, "PIN-Login: Fehlversuche bis zur Sperre (0 = aus)"),
    ConfigDefault("pin_sperre_minuten", "15", ConfigTyp.INT, "PIN-Login: Sperrdauer in Minuten nach zu vielen Fehlversuchen"),
    # Aufbewahrungsfrist des Audit-Logs: Einträge, die älter sind, werden
    # täglich automatisch gelöscht (Datenminimierung). 0 = keine Löschung.
    ConfigDefault("audit_aufbewahrung_tage", "365", ConfigTyp.INT, "Audit-Log: Aufbewahrungsfrist in Tagen (0 = unbegrenzt)"),
    # Brute-Force-Schutz für den Gruppenführer-Login (analog PIN). Nach so vielen
    # aufeinanderfolgenden Fehlversuchen wird der betroffene Zugang für die
    # angegebene Dauer gesperrt (0 = Sperre aus; Sperre läuft automatisch ab).
    ConfigDefault("gruppenfuehrer_login_max_fehlversuche", "5", ConfigTyp.INT, "Gruppenführer-Login: Fehlversuche bis zur Sperre (0 = aus)"),
    ConfigDefault("gruppenfuehrer_login_sperre_minuten", "15", ConfigTyp.INT, "Gruppenführer-Login: Sperrdauer in Minuten nach zu vielen Fehlversuchen"),
    # Reihenfolge der Feature-Module (Kiosk-Kacheln + Modul-Unterseiten), als
    # kommagetrennte Key-Liste. Unbekannte/fehlende Keys werden beim Lesen
    # anhand der Registry ergänzt bzw. ignoriert.
    ConfigDefault(
        "modul_reihenfolge",
        "personal,fahrzeuge,benachrichtigungen,kiosk,backup,minio,einsatztagebuch,dienstbuch,dienststunden,fahrzeugbuchung,formular,divera,barcode",
        ConfigTyp.STR,
        "Reihenfolge der Feature-Module (kommagetrennte Keys)",
    ),
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
    ConfigDefault(
        "modul_formular_startseite", "false", ConfigTyp.BOOL, "Formulare auf Startseite anzeigen"
    ),
    # Außenzugriff: ob Mitglieder dieses Modul auch über den öffentlichen
    # Mitglieder-Login (außerhalb des Gerätehaus-Kiosks) nutzen dürfen.
    ConfigDefault(
        "modul_einsatztagebuch_aussenzugriff", "false", ConfigTyp.BOOL, "Einsatztagebuch für Mitglieder-Login freigeben"
    ),
    ConfigDefault(
        "modul_dienstbuch_aussenzugriff", "false", ConfigTyp.BOOL, "Dienstbuch für Mitglieder-Login freigeben"
    ),
    ConfigDefault(
        "modul_dienststunden_aussenzugriff", "false", ConfigTyp.BOOL, "Dienststunden für Mitglieder-Login freigeben"
    ),
    ConfigDefault(
        "modul_fahrzeugbuchung_aussenzugriff", "false", ConfigTyp.BOOL, "Fahrzeugbuchung für Mitglieder-Login freigeben"
    ),
    ConfigDefault(
        "fahrzeugbuchung_ical_urls",
        "",
        ConfigTyp.STR,
        "Externe iCal-/webcal-URLs (eine pro Zeile) – Fremdtermine werden im Buchungskalender überlagert und in die Konfliktprüfung einbezogen",
    ),
    ConfigDefault(
        "modul_formular_aussenzugriff", "false", ConfigTyp.BOOL, "Formulare für Mitglieder-Login freigeben"
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
    ConfigDefault(
        "einsatz_statistik_offset",
        "0",
        ConfigTyp.INT,
        "Startwert: bereits im laufenden Jahr abgearbeitete Einsätze vor App-Einführung (fließt in die Jahresstatistik ein)",
    ),
    ConfigDefault(
        "einsatz_statistik_offset_jahr",
        "0",
        ConfigTyp.INT,
        "Jahr, für das der Einsatz-Startwert gilt (0 = keiner)",
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
    # Aktivitäts-Ampel Personal: Tage ohne Eintrag (Einsatz/Dienstbuch/Dienststunden,
    # je nach aktivem Modul), ab denen die Personen-Kachel gelb bzw. rot wird.
    ConfigDefault(
        "personal_ampel_gelb_tage",
        "30",
        ConfigTyp.INT,
        "Tage ohne relevanten Eintrag, ab denen die Personen-Ampel gelb wird. 0 = aus.",
    ),
    ConfigDefault(
        "personal_ampel_rot_tage",
        "60",
        ConfigTyp.INT,
        "Tage ohne relevanten Eintrag, ab denen die Personen-Ampel rot wird. 0 = aus.",
    ),
    # Divera 24/7
    ConfigDefault("divera_aktiv", "false", ConfigTyp.BOOL, "Divera-Anbindung aktiv"),
    ConfigDefault("divera_api_key", "", ConfigTyp.STR, "Divera Accesskey/API-Key"),
    ConfigDefault("divera_modus", "polling", ConfigTyp.STR, "Divera-Modus: polling oder webhook"),
    ConfigDefault("divera_letzter_sync", "", ConfigTyp.STR, "Zeitpunkt des letzten Divera-Polling-Abrufs (ISO 8601)"),
    ConfigDefault("divera_letzter_sync_anzahl", "0", ConfigTyp.INT, "Anzahl der beim letzten Sync gefundenen Alarme"),
    ConfigDefault("divera_last_ts", "0", ConfigTyp.INT, "Divera data.ts aus dem letzten Pull (für lastUpdate-Parameter)"),
    # Update-Kanal
    ConfigDefault("update_kanal", "stable", ConfigTyp.STR, "Update-Kanal: stable oder beta"),
    # Fehlerberichte (Sentry) – Zustimmung pro Instanz, Default aus. Sendet an
    # die feste DSN in app/core/sentry_setup.py, sofern nicht per .env überschrieben.
    ConfigDefault(
        "fehlerberichte_aktiv",
        "false",
        ConfigTyp.BOOL,
        "Technische Fehlerberichte zur Verbesserung der App an den Entwickler senden",
    ),
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
        "benachrichtigung_divera_alarm",
        "true",
        ConfigTyp.BOOL,
        "Benachrichtigung, wenn ein neuer Alarm über Divera angelegt wird",
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
    ConfigDefault(
        "benachrichtigung_person_ampel_gelb",
        "true",
        ConfigTyp.BOOL,
        "Benachrichtigung, wenn eine Person die gelbe Aktivitäts-Ampel erreicht",
    ),
    ConfigDefault(
        "benachrichtigung_person_ampel_rot",
        "true",
        ConfigTyp.BOOL,
        "Benachrichtigung, wenn eine Person die rote Aktivitäts-Ampel erreicht",
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
    # Druck-Fallback per IPP: druckt das bereits erzeugte Einsatz-/Dienstbuch-PDF
    # an einen Netzwerkdrucker – als Fallback bei Mail-Fehler und optional „immer".
    ConfigDefault("drucker_aktiv", "false", ConfigTyp.BOOL, "Netzwerkdrucker-Fallback (IPP) aktiv"),
    ConfigDefault(
        "drucker_ipp_url",
        "",
        ConfigTyp.STR,
        "IPP-URL des Netzwerkdruckers (z. B. ipp://drucker.local:631/ipp/print)",
    ),
    ConfigDefault(
        "drucker_immer_einsatz",
        "false",
        ConfigTyp.BOOL,
        "Einsatz-PDF beim Abschluss immer ausdrucken (nicht nur bei Mail-Fehler)",
    ),
    ConfigDefault(
        "drucker_immer_dienstbuch",
        "false",
        ConfigTyp.BOOL,
        "Dienstbuch-PDF beim Abschluss immer ausdrucken (nicht nur bei Mail-Fehler)",
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
        "benachrichtigung_text_divera_alarm",
        "Neuer Einsatz via Divera: {titel}",
        ConfigTyp.STR,
        "Text bei neuem Divera-Alarm. Platzhalter: {titel}",
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
        "benachrichtigung_text_barcode_mail",
        "Hallo {person},\n\nim Anhang findest du deinen persönlichen Barcode für Gerätehaus.app.",
        ConfigTyp.STR,
        "Text beim Versand des Barcodes per E-Mail. Platzhalter: {person}",
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
    ConfigDefault(
        "benachrichtigung_text_person_ampel_gelb",
        "{name} hatte seit {tage} Tagen keinen Einsatz, Dienst oder Dienststunden mehr (Ampel gelb).",
        ConfigTyp.STR,
        "Text bei gelber Aktivitäts-Ampel. Platzhalter: {name}, {tage}",
    ),
    ConfigDefault(
        "benachrichtigung_text_person_ampel_rot",
        "{name} hatte seit {tage} Tagen keinen Einsatz, Dienst oder Dienststunden mehr (Ampel rot).",
        ConfigTyp.STR,
        "Text bei roter Aktivitäts-Ampel. Platzhalter: {name}, {tage}",
    ),
    # Setup
    ConfigDefault("setup_abgeschlossen", "false", ConfigTyp.BOOL, "Setup-Wizard abgeschlossen"),
    # Backup-Modul
    ConfigDefault("backup_zeit_stunde", "3", ConfigTyp.INT, "Uhrzeit (Stunde) für automatische Backups"),
    ConfigDefault("backup_zeit_minute", "0", ConfigTyp.INT, "Uhrzeit (Minute) für automatische Backups"),
    ConfigDefault(
        "backup_wochentage", "0,1,2,3,4,5,6", ConfigTyp.STR,
        "Wochentage für automatische Backups (0=Mo … 6=So, kommagetrennt; leer = aus)",
    ),
    ConfigDefault("backup_max_anzahl", "7", ConfigTyp.INT, "Maximale Anzahl aufbewahrter Backups je Ziel"),
    ConfigDefault("backup_passphrase", "", ConfigTyp.STR, "Passphrase zur Verschlüsselung der Backups"),
    # Ergebnis der letzten automatischen Backup-Integritätsprüfung (read-only befüllt).
    ConfigDefault("backup_integritaet_am", "", ConfigTyp.STR, "Zeitpunkt der letzten Backup-Integritätsprüfung (ISO)"),
    ConfigDefault("backup_integritaet_ok", "", ConfigTyp.STR, "Ergebnis der letzten Prüfung (true/false/leer=unbekannt)"),
    ConfigDefault("backup_integritaet_detail", "", ConfigTyp.STR, "Detailtext der letzten Backup-Integritätsprüfung"),
    ConfigDefault("backup_integritaet_datei", "", ConfigTyp.STR, "Geprüfte Backup-Datei der letzten Integritätsprüfung"),
    ConfigDefault("backup_lokal_aktiv", "true", ConfigTyp.BOOL, "Backup-Ziel: lokaler Ordner/Mount aktiv"),
    ConfigDefault("backup_lokal_pfad", "/app/backups", ConfigTyp.STR, "Backup-Ziel: lokaler Ordner-Pfad"),
    ConfigDefault("backup_webdav_aktiv", "false", ConfigTyp.BOOL, "Backup-Ziel: WebDAV aktiv"),
    ConfigDefault("backup_webdav_url", "", ConfigTyp.STR, "WebDAV-Basis-URL (z. B. https://cloud/remote.php/dav/files/user)"),
    ConfigDefault("backup_webdav_user", "", ConfigTyp.STR, "WebDAV-Benutzer"),
    ConfigDefault("backup_webdav_passwort", "", ConfigTyp.STR, "WebDAV-Passwort/App-Token"),
    ConfigDefault("backup_webdav_pfad", "geratehaus-backups", ConfigTyp.STR, "WebDAV-Unterordner für Backups"),
    ConfigDefault("backup_fehler_mail_aktiv", "false", ConfigTyp.BOOL, "Bei fehlgeschlagenem Backup Admins per Mail benachrichtigen"),
    # Backup-Ziel: S3-kompatibel (AWS S3, MinIO, Backblaze B2 …)
    ConfigDefault("backup_s3_aktiv", "false", ConfigTyp.BOOL, "Backup-Ziel: S3-kompatibel aktiv"),
    ConfigDefault("backup_s3_endpoint", "", ConfigTyp.STR, "S3-Endpoint-URL (leer = AWS; für MinIO z. B. http://minio:9000)"),
    ConfigDefault("backup_s3_region", "us-east-1", ConfigTyp.STR, "S3-Region"),
    ConfigDefault("backup_s3_bucket", "", ConfigTyp.STR, "S3-Bucket"),
    ConfigDefault("backup_s3_access_key", "", ConfigTyp.STR, "S3 Access Key"),
    ConfigDefault("backup_s3_secret_key", "", ConfigTyp.STR, "S3 Secret Key"),
    ConfigDefault("backup_s3_pfad", "backups", ConfigTyp.STR, "S3-Präfix (Ordner) für Backups"),
    # Backup-Ziel: SFTP/SSH
    ConfigDefault("backup_sftp_aktiv", "false", ConfigTyp.BOOL, "Backup-Ziel: SFTP aktiv"),
    ConfigDefault("backup_sftp_host", "", ConfigTyp.STR, "SFTP-Host"),
    ConfigDefault("backup_sftp_port", "22", ConfigTyp.INT, "SFTP-Port"),
    ConfigDefault("backup_sftp_user", "", ConfigTyp.STR, "SFTP-Benutzer"),
    ConfigDefault("backup_sftp_passwort", "", ConfigTyp.STR, "SFTP-Passwort"),
    ConfigDefault("backup_sftp_pfad", "geratehaus-backups", ConfigTyp.STR, "SFTP-Zielverzeichnis"),
    # Backup-Ziel: E-Mail-Versand (Backup als Anhang an die Benachrichtigungs-Empfänger)
    ConfigDefault("backup_email_aktiv", "false", ConfigTyp.BOOL, "Backup-Ziel: als E-Mail-Anhang versenden"),
    # PDF-Archiv im Objektspeicher (S3/MinIO): alle erzeugten PDFs zusätzlich sichern
    ConfigDefault("backup_pdf_archiv_aktiv", "false", ConfigTyp.BOOL, "Erzeugte PDFs zusätzlich im S3-Objektspeicher archivieren"),
    ConfigDefault("backup_pdf_archiv_pfad", "pdfs", ConfigTyp.STR, "S3-Präfix (Ordner) für das PDF-Archiv"),
    # MinIO-Modul (Objektspeicher). modul_minio_aktiv wird über das Feature-Modul verwaltet.
    ConfigDefault("minio_endpoint", "http://minio:9000", ConfigTyp.STR, "MinIO/S3-Endpoint-URL"),
    ConfigDefault("minio_console_url", "", ConfigTyp.STR, "MinIO-Konsolen-URL (im Browser erreichbar, z. B. http://host:9101)"),
    ConfigDefault("minio_region", "us-east-1", ConfigTyp.STR, "MinIO/S3-Region"),
    ConfigDefault("minio_access_key", "", ConfigTyp.STR, "MinIO Access Key"),
    ConfigDefault("minio_secret_key", "", ConfigTyp.STR, "MinIO Secret Key"),
    ConfigDefault("minio_bucket_backups", "geratehaus-backups", ConfigTyp.STR, "Bucket für Voll-Backups"),
    ConfigDefault("minio_bucket_einsaetze", "einsaetze", ConfigTyp.STR, "Bucket für Einsatz-Dokumente (Ordner je Einsatz)"),
    ConfigDefault("minio_bucket_dienstbuecher", "dienstbuecher", ConfigTyp.STR, "Bucket für Dienstbuch-Dokumente (flach)"),
    # Backup-Ziel: MinIO (nutzt die Verbindung des MinIO-Moduls)
    ConfigDefault("backup_minio_aktiv", "false", ConfigTyp.BOOL, "Backup-Ziel: MinIO (Modul MinIO)"),
]
