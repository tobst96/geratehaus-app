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
 * `pages/KioskHome.tsx`, `pages/mitglied/MitgliedLogin.tsx`.
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
