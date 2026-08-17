import { Link } from "react-router-dom";
import { useConfig } from "../context/ConfigContext";
import { texte } from "../i18n/texte";

export function LandingPage() {
  const { config } = useConfig();
  const t = texte.landing;

  return (
    <div className="seite">
      <div className="karte text-center">
        <h1>{config?.organisation_name ?? "Gerätehaus.app"}</h1>
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
