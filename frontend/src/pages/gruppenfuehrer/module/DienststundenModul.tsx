import { Link } from "react-router-dom";
import { FunktionenDienststundenVerwaltung } from "../verwaltung/FunktionenDienststundenVerwaltung";

export function DienststundenModul() {
  return (
    <div>
      <p>
        <Link to="/gruppenfuehrer/module">← Zurück zu den Modulen</Link>
      </p>
      <h1>Dienststunden</h1>

      <div className="karte">
        <h2>Funktionen &amp; Schwellenwerte</h2>
        <p className="text-mute">
          Funktionen mit Schwellenwert (Stunden). Überschreitungen erscheinen im{" "}
          <Link to="/gruppenfuehrer/dashboard">Dashboard</Link>.
        </p>
        <FunktionenDienststundenVerwaltung />
      </div>
    </div>
  );
}
