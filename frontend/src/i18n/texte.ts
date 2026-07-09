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
 * Erste migrierte Seite: `pages/LandingPage.tsx`.
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
} as const;
