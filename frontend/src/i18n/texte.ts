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
 * Migrierte Seiten: `pages/LandingPage.tsx`, `pages/PinSetzen.tsx`.
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
} as const;
