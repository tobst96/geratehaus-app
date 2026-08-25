import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiGet } from "../api/client";
import type { OeffentlicheKonfiguration } from "../api/types";
import { sentryInitialisieren } from "../sentry";
import { setZeitzone } from "../utils/datum";
import { ConfigContext, DEFAULT_KONFIG } from "./ConfigContext";

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
        setZeitzone(daten.zeitzone);
        farbenInjizieren(daten);
        // Fehler-Monitoring initialisieren, sobald die Zustimmung/DSN bekannt ist.
        sentryInitialisieren(daten);
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

  // Stabile Identität für neuLaden (kein neuer Funktionswert bei jedem Render) und
  // für das Provider-value-Objekt selbst - sonst rendert jeder Consumer bei jedem
  // Render dieses Providers neu, auch wenn sich config/ladeFehler gar nicht ändern.
  const neuLaden = useCallback(() => setVersion((v) => v + 1), []);
  const value = useMemo(() => ({ config, ladeFehler, neuLaden }), [config, ladeFehler, neuLaden]);

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}
