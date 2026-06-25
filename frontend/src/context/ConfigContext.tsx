import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { apiGet } from "../api/client";
import type { OeffentlicheKonfiguration } from "../api/types";

interface ConfigContextValue {
  config: OeffentlicheKonfiguration | null;
  ladeFehler: string | null;
  neuLaden: () => void;
}

const DEFAULT_KONFIG: OeffentlicheKonfiguration = {
  organisation_name: "Meine Feuerwehr",
  logo_url: "",
  farbe_primaer: "#FFA633",
  farbe_akzent: "#1A1A1A",
  einsatz_countdown_minuten: 30,
  einsatz_alle_eingetragen_minuten: 30,
  modul_einsatztagebuch_aktiv: true,
  modul_dienstbuch_aktiv: true,
  modul_dienststunden_aktiv: true,
  modul_fahrzeugbuchung_aktiv: true,
  modul_einsatztagebuch_startseite: true,
  modul_dienstbuch_startseite: true,
  modul_dienststunden_startseite: true,
  modul_fahrzeugbuchung_startseite: false,
};

const ConfigContext = createContext<ConfigContextValue>({
  config: DEFAULT_KONFIG,
  ladeFehler: null,
  neuLaden: () => {},
});

function farbenInjizieren(config: OeffentlicheKonfiguration): void {
  const root = document.documentElement.style;
  root.setProperty("--farbe-primaer", config.farbe_primaer);
  root.setProperty("--farbe-akzent", config.farbe_akzent);
  document.title = `${config.organisation_name} – Gerätehaus.app`;

  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) {
    themeMeta.setAttribute("content", config.farbe_primaer);
  }

  let favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!favicon) {
    favicon = document.createElement("link");
    favicon.rel = "icon";
    document.head.appendChild(favicon);
  }
  favicon.href = config.logo_url || "/api/v1/standard-icon.svg";
}

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<OeffentlicheKonfiguration | null>(null);
  const [ladeFehler, setLadeFehler] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let abgebrochen = false;
    apiGet<OeffentlicheKonfiguration>("/oeffentliche-konfiguration")
      .then((daten) => {
        if (abgebrochen) return;
        setConfig(daten);
        farbenInjizieren(daten);
        setLadeFehler(null);
      })
      .catch(() => {
        if (abgebrochen) return;
        setConfig(DEFAULT_KONFIG);
        farbenInjizieren(DEFAULT_KONFIG);
        setLadeFehler("Konfiguration konnte nicht geladen werden.");
      });
    return () => {
      abgebrochen = true;
    };
  }, [version]);

  return (
    <ConfigContext.Provider value={{ config, ladeFehler, neuLaden: () => setVersion((v) => v + 1) }}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig(): ConfigContextValue {
  return useContext(ConfigContext);
}
