/**
 * Zentrale String-Quelle („leichtes i18n").
 *
 * Ziel: feste UI-Texte an EINER Stelle bündeln, damit Wording je Feuerwehr leicht
 * angepasst und später ggf. übersetzt werden kann. **Deutsch bleibt** die einzige
 * Sprache – daher bewusst kein i18n-Framework/Hook, sondern ein einfaches, getyptes
 * Objekt: `import { texte } from "../i18n/texte"` und `texte.<bereich>.<schlüssel>`.
 *
 * Konvention:
 * - Nach Seite/Feature verschachteln (`texte.landing`, `texte.login`, …).
 * - Nur **statische** Texte hier ablegen; dynamische Werte (Namen, Zahlen, aus
 *   `config`) bleiben im Component. Für Einsetzungen kleine Funktionen nutzen.
 * - Migration seitenweise – Bestand bleibt bis dahin inline (kein Big-Bang).
 *
 * Migrierte Seiten: `pages/LandingPage.tsx`, `pages/PinSetzen.tsx`, `pages/PersonFreigabe.tsx`,
 * `pages/KioskHome.tsx`, `pages/mitglied/MitgliedLogin.tsx`, `pages/Start.tsx`,
 * `pages/NotFound.tsx`, `pages/PersonBildHochladen.tsx`, `pages/ManuelleEintragung.tsx`,
 * `pages/DienstbuchManuelleEintragung.tsx`, `pages/DienststundenManuelleEintragung.tsx`,
 * `pages/FahrzeugbuchungManuelleEintragung.tsx`, `pages/gruppenfuehrer/GruppenfuehrerLogin.tsx`,
 * `pages/gruppenfuehrer/Dashboard.tsx`, `pages/gruppenfuehrer/FormularZusammenfassung.tsx`,
 * `pages/gruppenfuehrer/ModulUnterseite.tsx`, `pages/gruppenfuehrer/Buchungsmanagement.tsx`,
 * `pages/gruppenfuehrer/AuditLog.tsx`, `pages/gruppenfuehrer/Systemstatus.tsx`,
 * `pages/gruppenfuehrer/Update.tsx` (Intro-Absatz mit <code> bewusst inline),
 * `pages/gruppenfuehrer/Berechtigungen.tsx`, `pages/gruppenfuehrer/PersonKanaele.tsx`.
 */
export const texte = {
  landing: {
    untertitel:
      "Die digitale Einsatzverwaltung für Feuerwehren und ähnliche Organisationen: " +
      "Einsatzberichte, Dienstbücher, Dienststunden und Fahrzeugbuchungen – papierlos, " +
      "am Gerätehaus-Tablet und von überall per Login.",
    mitglied: {
      titel: "Mitglied",
      beschreibung:
        "Per Barcode anmelden und – falls freigegeben – eigene Einsätze, Dienstbuch, " +
        "Dienststunden oder Fahrzeugbuchungen verwalten.",
      login: "Mitglieder-Login",
    },
    gruppenfuehrer: {
      titel: "Gruppenführer",
      beschreibung:
        "Einsatzberichte, Dienstbucheinträge und Fahrzeugreservierungen einsehen und bearbeiten.",
      login: "Gruppenführer-Login",
    },
    admin: {
      titel: "Admin",
      beschreibung: "Personal, Stammdaten und alle Einstellungen verwalten.",
      login: "Admin-Login",
    },
    kiosk_hinweis:
      'Du betreust ein Tablet im Gerätehaus? Den Kiosk-Modus-Link dafür erzeugt ein Admin unter "Kiosk-Geräte".',
    api_doku: "API-Dokumentation (Swagger)",
  },
  pin_setzen: {
    titel: "PIN setzen",
    link_ungueltig: "Link ungültig.",
    pin_zu_kurz: "Der PIN muss mindestens 4 Zeichen haben.",
    pins_ungleich: "Die PINs stimmen nicht überein.",
    fehler_speichern: "PIN konnte nicht gesetzt werden.",
    fertig: "Dein PIN wurde gesetzt. Du kannst dich jetzt am Gerätehaus mit deinem Namen und PIN anmelden.",
    link_abgelaufen: "Dieser Link ist abgelaufen oder wurde bereits verwendet.",
    // „Für <Name> einen persönlichen PIN festlegen." – Name bleibt dynamisch im Component.
    fuer_person_prefix: "Für",
    fuer_person_suffix: "einen persönlichen PIN festlegen.",
    label_pin: "Neuer PIN",
    label_pin_wiederholen: "PIN wiederholen",
    speichern_laeuft: "Wird gespeichert…",
  },
  person_freigabe: {
    titel: "Personen-Freigabe",
    ungueltig: "Freigabe ungültig.",
    email_pflicht: "Bitte eine E-Mail-Adresse angeben.",
    pin_zu_kurz: "Der PIN muss mindestens 4 Zeichen haben.",
    freigeben_fehler: "Freigabe fehlgeschlagen.",
    ablehnen_fehler: "Ablehnen fehlgeschlagen.",
    abgelehnt: "Die Anfrage wurde abgelehnt.",
    nicht_mehr_offen: "Diese Freigabe ist nicht mehr offen.",
    // Name bleibt dynamisch im Component → Text als Suffix/Prefix.
    freigegeben_suffix:
      "wurde freigegeben. Falls kein PIN direkt gesetzt wurde, erhält die Person einen Link zum Setzen des PINs per E-Mail.",
    ablehnen_frage_prefix: "Anfrage von",
    ablehnen_frage_suffix: "ablehnen?",
    hinterlegen_prefix: "Für",
    hinterlegen_suffix: "eine E-Mail-Adresse hinterlegen (und optional direkt einen PIN setzen).",
    label_email: "E-Mail-Adresse",
    label_pin_optional: "PIN (optional)",
    pin_platzhalter: "Leer lassen, dann setzt die Person ihn selbst",
    ablehnen: "Ablehnen",
    ablehnen_laeuft: "Wird abgelehnt…",
    freigeben: "Freigeben",
    speichern_laeuft: "Wird gespeichert…",
  },
  kiosk: {
    frage: "Was möchtest du machen?",
    kacheln: {
      einsatzbericht: "Einsatzbericht",
      dienstbuch: "Dienstbuch",
      dienststunden: "Dienststunden",
      fahrzeugbuchung: "Fahrzeugbuchung",
      formulare: "Formulare",
    },
  },
  manuelle_eintragung: {
    reservierung_fehler: "Reservierung konnte nicht geladen werden.",
    eintragung_fehler: "Eintragung fehlgeschlagen.",
    warten_titel: "Kurz gewartet",
    // „… Bitte warte noch ca. <n> <Minute(n)>, bevor du es erneut versuchst."
    warten_prefix: "Du hast dich auf diesem Gerät vor Kurzem bereits eingetragen. Bitte warte noch ca.",
    warten_suffix: ", bevor du es erneut versuchst.",
    minute: "Minute",
    minuten: "Minuten",
    eingetragen_titel: "Eingetragen!",
    // „Du wurdest für <bezeichnung> im Einsatz „<titel>" eingetragen. …"
    eingetragen_prefix: "Du wurdest für",
    eingetragen_mitte: "im Einsatz",
    eingetragen_suffix: "eingetragen. Du kannst diese Seite jetzt schließen.",
    bereits_genutzt_titel: "Bereits genutzt",
    bereits_genutzt_text:
      "Diese Reservierung wurde bereits verwendet. Bitte am Gerätehaus einen neuen QR-Code erzeugen.",
    abgelaufen_titel: "Abgelaufen",
    abgelaufen_text: "Diese Reservierung ist abgelaufen. Bitte am Gerätehaus einen neuen QR-Code erzeugen.",
    titel: "Ohne Barcode eintragen",
    einsatz_label: "Einsatz",
    wer_bist_du: "Wer bist du?",
    aendern: "Ändern",
    namen_platzhalter: "Namen eingeben und auswählen…",
    keine_person:
      "Keine Person gefunden. Bitte am Gerätehaus in den Personen-Stammdaten anlegen lassen.",
    kein_pin:
      "Für dich ist kein PIN hinterlegt. Eine Selbst-Eintragung ohne PIN ist nicht möglich – bitte im Gerätehaus einen persönlichen PIN setzen (lassen).",
    dein_pin: "Dein PIN",
    vab: "Verdienstausfallbescheinigung",
    atemschutz_angelegt: "Atemschutz angelegt",
    atemschutzminuten_label: "Atemschutzminuten:",
    bemerkung_label: "Bemerkung (optional)",
    bemerkung_platzhalter: "Notizen…",
    speichern_laeuft: "Wird gespeichert…",
    eintragen: "Eintragen",
  },
  dienstbuch_eintragung: {
    // Ergänzt `manuelle_eintragung` um die Dienstbuch-spezifischen Texte.
    dienstbuch_label: "Dienstbuch", // Kopf: <label> „<titel>"
    eingetragen_prefix: "Du wurdest für das Dienstbuch", // … „<titel>" <manuelle_eintragung.eingetragen_suffix>
    gruppe: "Gruppe",
    keine_gruppe: "– keine –",
  },
  dienststunden_eintragung: {
    // Ergänzt `manuelle_eintragung` um die Dienststunden-spezifischen Texte.
    titel: "Dienststunden ohne Barcode eintragen",
    erfasst_text: "Deine Dienststunden wurden erfasst. Du kannst diese Seite jetzt schließen.",
    als: "als", // „<name>: <stunden> als <funktion> am <datum>"
    am: "am",
    funktion: "Funktion",
    stunden: "Stunden",
    datum: "Datum",
  },
  fahrzeugbuchung_eintragung: {
    // Fahrzeugbuchung „anfragen" (nicht „eintragen") – eigene Buttons/Erfolgstexte.
    titel: "Fahrzeugbuchung ohne Barcode anfragen",
    anfrage_fehler: "Anfrage konnte nicht gestellt werden.",
    angefragt_titel: "Anfrage gestellt!",
    angefragt_text: "Deine Fahrzeugbuchung wurde angefragt. Du kannst diese Seite jetzt schließen.",
    kein_pin:
      "Für dich ist kein PIN hinterlegt. Eine Selbst-Buchung ohne PIN ist nicht möglich – bitte im Gerätehaus einen persönlichen PIN setzen (lassen).",
    fahrzeug: "Fahrzeug",
    von: "Von",
    bis: "Bis",
    zweck: "Zweck",
    stellen_laeuft: "Wird gestellt…",
    anfrage_stellen: "Anfrage stellen",
  },
  update: {
    titel: "Update",
    ladefehler: "Status konnte nicht geladen werden.",
    ausloesen_fehler: "Update konnte nicht angestoßen werden.",
    kanal_fehler: "Kanal konnte nicht geändert werden.",
    installieren_confirm:
      "Update jetzt installieren? Der Server aktualisiert sich und startet dabei kurz neu.",
    kanal_titel: "Update-Kanal",
    stable: "Stable",
    beta: "Beta",
    versionsstatus: "Versionsstatus",
    installierte_version: "Installierte Version",
    verfuegbare_version: "Verfügbare Version", // gefolgt von (Kanal)
    veroeffentlicht_am: "Veröffentlicht am",
    neue_version_verfuegbar: "🆕 Es ist eine neue Version verfügbar.",
    release_hinweise: "Release-Hinweise ansehen",
    installieren: "Update installieren",
    installieren_laeuft: "Update wird angestoßen …",
    aktuell: "Du bist auf dem neuesten Stand.",
    erneut_pruefen: "Erneut prüfen",
  },
  systemstatus: {
    titel: "Systemstatus",
    ladefehler: "Status konnte nicht geladen werden.",
    aktualisieren: "Aktualisieren",
    aktualisieren_laeuft: "Aktualisiere …",
    intro:
      "Betriebsstatus der Kern-Dienste und geplanten Hintergrund-Jobs. Nur für Admins sichtbar – " +
      "hilft beim Self-Hosting-Support.",
    dienste: "Dienste",
    version: "Version",
    datenbank: "Datenbank",
    email_smtp: "E-Mail (SMTP)",
    objektspeicher: "Objektspeicher (MinIO)",
    divera: "Divera",
    hintergrund_jobs: "Hintergrund-Jobs",
    keine_jobs: "Keine geplanten Jobs.",
    th_job: "Job",
    th_naechster_lauf: "Nächster Lauf",
    // Ampel-/Status-Kurztexte
    nv: "n/v",
    ok: "OK",
    fehler: "Fehler",
    aktiv: "aktiv",
    konfiguriert: "konfiguriert",
    nicht_konfiguriert: "nicht konfiguriert",
    erreichbar: "erreichbar",
    nicht_erreichbar: "nicht erreichbar",
    inaktiv: "inaktiv",
    laeuft: "läuft",
    gestoppt: "gestoppt",
    api_key_gesetzt: "aktiv · API-Key gesetzt",
    kein_api_key: "aktiv · kein API-Key",
  },
  person_kanaele: {
    kanaele_titel: "Benachrichtigungskanäle",
    keine_email: "Keine E-Mail bei der Person hinterlegt",
    aktiv: "aktiv",
    speichern: "Speichern",
    gespeichert: "Gespeichert.",
    speichern_fehler: "Speichern fehlgeschlagen.",
    abo_fehler: "Abo konnte nicht gesetzt werden.",
    welche_titel: "Welche Benachrichtigungen?",
    welche_intro:
      "Nur abonnierte Ereignisse werden über die aktiven Kanäle oben zugestellt. " +
      "Angeboten werden nur Ereignisse aktivierter Module.",
  },
  berechtigungen: {
    titel: "Berechtigungen",
    ladefehler: "Berechtigungen konnten nicht geladen werden.",
    setzen_fehler: "Berechtigung konnte nicht gesetzt werden.",
    intro:
      "Zugriff je Gruppenführer und Modul. Admins haben immer Vollzugriff. Hinweis: Die " +
      "Berechtigungen werden bereits gepflegt, greifen aber noch nicht (Aktivierung folgt in " +
      "einem späteren Schritt).",
    filter_label: "Nach Zugriff auf Modul filtern",
    alle_anzeigen: "– alle anzeigen –",
    th_gruppenfuehrer: "Gruppenführer",
    admin_vollzugriff: "(Admin – Vollzugriff)",
    keine_treffer: "Keine Gruppenführer mit diesem Zugriff.",
  },
  audit_log: {
    titel: "Audit-Log",
    ladefehler: "Audit-Log konnte nicht geladen werden.",
    intro:
      "Sicherheitsrelevante Aktionen (Löschungen, Freigaben, Rechte- und Zugangsänderungen), " +
      "neueste zuerst. Nur für Admins sichtbar. Einträge älter als die konfigurierte " +
      "Aufbewahrungsfrist werden automatisch gelöscht.",
    filter_label: "Nach Aktion filtern",
    alle_anzeigen: "– alle anzeigen –",
    neu_laden: "Neu laden",
    export_csv: "Export CSV",
    export_json: "Export JSON",
    th_zeitpunkt: "Zeitpunkt",
    th_akteur: "Akteur",
    th_aktion: "Aktion",
    th_objekt: "Objekt",
    th_details: "Details",
    keine_eintraege: "Keine Einträge.",
    // Menschlesbare Labels für die maschinellen Aktions-Schlüssel (auch historische).
    aktionen: {
      person_geloescht: "Person gelöscht",
      einsatz_geloescht: "Einsatz gelöscht",
      buchung_genehmigt: "Buchung genehmigt",
      buchung_abgelehnt: "Buchung abgelehnt",
      berechtigung_geaendert: "Berechtigung geändert",
      moderator_angelegt: "Gruppenführer angelegt",
      moderator_passwort_geaendert: "Gruppenführer-Passwort geändert",
      moderator_geloescht: "Gruppenführer gelöscht",
      modul_flag_geaendert: "Modul-Einstellung geändert",
    } as Record<string, string>,
  },
  buchungsmanagement: {
    titel: "Buchungsmanagement",
    ausstehende: "Ausstehende Anfragen", // gefolgt von (Anzahl)
    keine_ausstehenden: "Keine ausstehenden Anfragen.",
    zweck: "Zweck:",
    verantwortlich: "Verantwortlich:",
    konflikt_mit: "Konflikt mit:",
    genehmigen: "Genehmigen",
    ablehnen: "Ablehnen",
    ablehnungsgrund_platzhalter: "Ablehnungsgrund (optional)",
    ladefehler: "Buchungen konnten nicht geladen werden.",
    genehmigen_fehler: "Genehmigen fehlgeschlagen.",
    ablehnen_fehler: "Ablehnen fehlgeschlagen.",
  },
  formular_zusammenfassung: {
    einreichung_singular: "Einreichung",
    einreichung_plural: "Einreichungen",
    durchschnitt: "Durchschnitt:",
    keine_antworten: "Keine Antworten.",
  },
  modul_unterseite: {
    zurueck: "← Zurück zu den Modulen",
    unbekannt: "Unbekanntes Modul.",
  },
  dashboard: {
    titel: "Dashboard",
    ladefehler: "Dashboard konnte nicht geladen werden.",
    zu_buchungen: "Zu den Buchungen",
    offene_buchungen: "Offene Buchungen",
    zu_dienststunden: "Zu Listen → Dienststunden",
    schwellenwert_ueberschreitungen: "Schwellenwert-Überschreitungen",
    th_name: "Name",
    th_funktion: "Funktion",
    th_stunden: "Stunden",
    th_schwellenwert: "Schwellenwert",
    keine_ueberschreitungen: "Keine Überschreitungen.",
    einsaetze_pro_monat: "Einsätze pro Monat",
    keine_daten: "Keine Daten.",
  },
  gruppenfuehrer_login: {
    titel: "Anmeldung Gruppenführer / Admin",
    name: "Name",
    passwort: "Passwort",
    anmelden: "Anmelden",
    anmelden_laeuft: "Anmelden …",
    anmeldung_fehler: "Anmeldung fehlgeschlagen.",
    // 2FA-Schritt
    code_titel: "Bestätigungscode",
    code_hinweis:
      "Wir haben dir einen Anmelde-Code per E-Mail geschickt. Gib ihn hier ein (oder verwende einen deiner Recovery-Codes).",
    code_label: "Code",
    geraet_vertrauen: "Diesem Gerät 30 Tage vertrauen (kein Code mehr nötig)",
    pruefe: "Prüfe …",
    bestaetigen: "Bestätigen",
    code_ungueltig: "Code ungültig.",
  },
  start: {
    frage: "Wähle einen Bereich:",
    kacheln: {
      einsatztagebuch: "Einsatztagebuch",
      dienstbuch: "Dienstbuch",
      dienststunden: "Dienststunden",
      fahrzeugbuchung: "Fahrzeugbuchung",
    },
    pin_einrichten: "PIN einrichten",
    nur_geraetehaus: "(nur im Gerätehaus)",
    nicht_im_geraetehaus: "Ich bin nicht im Gerätehaus",
  },
  not_found: {
    titel: "Seite nicht gefunden",
    zur_startseite: "Zurück zur Startseite",
  },
  bild_hochladen: {
    reservierung_fehler: "Reservierung konnte nicht geladen werden.",
    upload_fehler: "Foto konnte nicht hochgeladen werden.",
    gespeichert_titel: "Foto gespeichert!",
    hochgeladenes_foto_alt: "Hochgeladenes Foto",
    // „Das Profilfoto für <Name> wurde gespeichert. …" – Name dynamisch.
    gespeichert_prefix: "Das Profilfoto für",
    gespeichert_suffix: "wurde gespeichert. Du kannst diese Seite jetzt schließen.",
    bereits_genutzt_titel: "Bereits genutzt",
    bereits_genutzt_text:
      "Dieser QR-Code wurde bereits verwendet. Bitte am Gerätehaus einen neuen erzeugen lassen.",
    abgelaufen_titel: "Abgelaufen",
    abgelaufen_text:
      "Dieser QR-Code ist abgelaufen. Bitte am Gerätehaus einen neuen erzeugen lassen.",
    // „Profilfoto für <Name>" – Name dynamisch.
    profilfoto_prefix: "Profilfoto für",
    hochladen_laeuft: "Wird hochgeladen…",
    foto_aufnehmen: "Foto aufnehmen oder auswählen",
  },
  mitglied_login: {
    titel: "Mitglieder-Login",
    anmeldung_fehler: "Anmeldung fehlgeschlagen.",
    qr_fehler: "QR-Code konnte nicht erzeugt werden.",
    qr_hinweis:
      "Mit dem Handy scannen und dich dort auswählen – dieses Gerät meldet sich danach automatisch an.",
    qr_alt: "QR-Code für Login ohne Barcode",
    gueltig_bis: "Gültig bis", // gefolgt von der dynamischen Uhrzeit
    zurueck_scannen: "Zurück zum Scannen",
    barcode_label: "Barcode einscannen",
    barcode_platzhalter: "Barcode scannen oder eingeben",
    anmelden: "Anmelden",
    anmelden_laeuft: "Wird angemeldet…",
    barcode_vergessen: "Barcode vergessen",
    qr_erzeugen_laeuft: "Erzeuge QR-Code …",
  },
} as const;
