import { Link } from "react-router-dom";
import { useConfig } from "../context/ConfigContext";

export function LandingPage() {
  const { config } = useConfig();

  return (
    <div className="seite">
      <div className="karte" style={{ textAlign: "center" }}>
        <h1>{config?.organisation_name ?? "Gerätehaus.app"}</h1>
        <p style={{ color: "var(--farbe-text-mute)", maxWidth: 560, margin: "0 auto" }}>
          Die digitale Einsatzverwaltung für Feuerwehren und ähnliche Organisationen: Einsatzberichte,
          Dienstbücher, Dienststunden und Fahrzeugbuchungen – papierlos, am Gerätehaus-Tablet und von
          überall per Login.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        <div className="karte">
          <h2>Mitglied</h2>
          <p style={{ color: "var(--farbe-text-mute)" }}>
            Per Barcode anmelden und – falls freigegeben – eigene Einsätze, Dienstbuch, Dienststunden
            oder Fahrzeugbuchungen verwalten.
          </p>
          <Link to="/mitglied/login">
            <button type="button">Mitglieder-Login</button>
          </Link>
        </div>

        <div className="karte">
          <h2>Gruppenführer</h2>
          <p style={{ color: "var(--farbe-text-mute)" }}>
            Einsatzberichte, Dienstbucheinträge und Fahrzeugreservierungen einsehen und bearbeiten.
          </p>
          <Link to="/moderator/login">
            <button type="button">Gruppenführer-Login</button>
          </Link>
        </div>

        <div className="karte">
          <h2>Admin</h2>
          <p style={{ color: "var(--farbe-text-mute)" }}>Personal, Punkte und alle Einstellungen verwalten.</p>
          <Link to="/moderator/login">
            <button type="button">Admin-Login</button>
          </Link>
        </div>
      </div>

      <div className="karte" style={{ textAlign: "center" }}>
        <p style={{ margin: 0 }}>
          Du betreust ein Tablet im Gerätehaus? Den Kiosk-Modus-Link dafür erzeugt ein Admin unter
          "Kiosk-Geräte".
        </p>
        <p style={{ margin: "0.5rem 0 0" }}>
          <a href="/api/v1/docs" target="_blank" rel="noreferrer">
            API-Dokumentation (Swagger)
          </a>
        </p>
      </div>
    </div>
  );
}
