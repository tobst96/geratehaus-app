import { createContext, useContext } from "react";
import type { OeffentlicheKonfiguration } from "../api/types";

interface ConfigContextValue {
  config: OeffentlicheKonfiguration | null;
  ladeFehler: string | null;
  neuLaden: () => void;
}

export const DEFAULT_KONFIG: OeffentlicheKonfiguration = {
  organisation_name: "Meine Feuerwehr",
  oeffentliche_basis_url: "",
  zeitzone: "Europe/Berlin",
  logo_url: "",
  logo_url_dark: "",
  farbe_primaer: "#FFA633",
  farbe_akzent: "#1A1A1A",
  impressum_verantwortliche_person: "",
  impressum_anschrift: "",
  impressum_email: "",
  impressum_telefon: "",
  impressum_zusatz: "",
  einsatz_countdown_minuten: 30,
  einsatz_alle_eingetragen_minuten: 30,
  modul_einsatztagebuch_aktiv: true,
  modul_dienstbuch_aktiv: true,
  modul_dienststunden_aktiv: true,
  modul_fahrzeugbuchung_aktiv: true,
  modul_formular_aktiv: false,
  modul_barcode_aktiv: false,
  kiosk_autolock_sekunden: 0,
  modul_einsatztagebuch_startseite: true,
  modul_dienstbuch_startseite: true,
  modul_dienststunden_startseite: true,
  modul_fahrzeugbuchung_startseite: false,
  modul_formular_startseite: false,
  modul_einsatztagebuch_aussenzugriff: false,
  modul_dienstbuch_aussenzugriff: false,
  modul_dienststunden_aussenzugriff: false,
  modul_fahrzeugbuchung_aussenzugriff: false,
  modul_formular_aussenzugriff: false,
  fehlerberichte_aktiv: false,
  sentry_dsn: "",
  sentry_environment: "production",
};

// Der Context selbst lebt in dieser Datei ohne Komponenten-Export, die
// Provider-Komponente in ConfigProvider.tsx – sonst bricht Fast Refresh
// (react-refresh/only-export-components), weil die Datei sowohl eine
// Komponente als auch Nicht-Komponenten-Werte (Context, Hook, Default) exportieren würde.
export const ConfigContext = createContext<ConfigContextValue>({
  config: DEFAULT_KONFIG,
  ladeFehler: null,
  neuLaden: () => {},
});

export function useConfig(): ConfigContextValue {
  return useContext(ConfigContext);
}
