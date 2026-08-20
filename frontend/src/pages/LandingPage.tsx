import { Link } from "react-router-dom";
import { useConfig } from "../context/ConfigContext";
import { texte } from "../i18n/texte";

export function LandingPage() {
  const { config } = useConfig();
  const t = texte.landing;

  // Der Header (Layout.tsx) zeigt bereits das Logo - diese Überschrift wäre bei
  // konfiguriertem Logo nur eine zweite, große Wiederholung des Organisationsnamens.
  // Bleibt für Screenreader/Seitenstruktur als einzige <h1> der Seite bestehen
  // (mit echtem Organisationsnamen), wird bei vorhandenem Logo aber nur visuell
  // ausgeblendet; ohne Logo zeigt sie wie der Header-Fallback "Gerätehaus.app".
  const hatLogo = Boolean(config?.logo_url || config?.logo_url_dark);

  return (
    <div className="seite">
      <div className="karte text-center">
        <h1 className={hatLogo ? "sr-only" : undefined}>
          {hatLogo ? config?.organisation_name ?? "Gerätehaus.app" : "Gerätehaus.app"}
        </h1>
        <p style={{ color: "var(--farbe-text-mute)", maxWidth: 560, margin: "0 auto" }}>
          {t.erklaerung}
        </p>
        <Link to="/mitglied/login">
          <button type="button" style={{ marginTop: 20 }}>
            {t.anmelden_button}
          </button>
        </Link>
      </div>

      <div className="karte text-center" style={{ opacity: 0.85 }}>
        <p style={{ margin: 0 }}>{t.kiosk_hinweis}</p>
        <p style={{ margin: "0.5rem 0 0" }}>
          <a href="/api/v1/docs" target="_blank" rel="noreferrer">
            {t.api_doku}
          </a>
        </p>
      </div>
    </div>
  );
}
