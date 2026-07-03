import { Link } from "react-router-dom";
import { FunktionenDienststundenVerwaltung } from "../verwaltung/FunktionenDienststundenVerwaltung";

export function DienststundenModul() {
  return (
    <div>
      <p>
        <Link to="/moderator/module">← Zurück zu den Modulen</Link>
      </p>
      <h1>Dienststunden</h1>

      <div className="karte">
        <h2>Funktionen &amp; Schwellenwerte</h2>
        <p style={{ color: "var(--farbe-text-mute)" }}>
          Funktionen mit Schwellenwert (Stunden). Überschreitungen erscheinen im{" "}
          <Link to="/moderator/dashboard">Dashboard</Link>.
        </p>
        <FunktionenDienststundenVerwaltung />
      </div>
    </div>
  );
}
