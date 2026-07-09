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
          {t.untertitel}
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        <div className="karte">
          <h2>{t.mitglied.titel}</h2>
          <p className="text-mute">{t.mitglied.beschreibung}</p>
          <Link to="/mitglied/login">
            <button type="button">{t.mitglied.login}</button>
          </Link>
        </div>

        <div className="karte">
          <h2>{t.gruppenfuehrer.titel}</h2>
          <p className="text-mute">{t.gruppenfuehrer.beschreibung}</p>
          <Link to="/gruppenfuehrer/login">
            <button type="button">{t.gruppenfuehrer.login}</button>
          </Link>
        </div>

        <div className="karte">
          <h2>{t.admin.titel}</h2>
          <p className="text-mute">{t.admin.beschreibung}</p>
          <Link to="/gruppenfuehrer/login">
            <button type="button">{t.admin.login}</button>
          </Link>
        </div>
      </div>

      <div className="karte text-center">
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
