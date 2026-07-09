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
 * `pages/DienstbuchManuelleEintragung.tsx`.
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
