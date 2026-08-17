import { Link } from "react-router-dom";
import { FahrzeugeVerwaltung } from "../verwaltung/FahrzeugeVerwaltung";

export function FahrzeugeModul() {
  return (
    <div>
      <p>
        <Link to="/gruppenfuehrer/module">← Zurück zu den Modulen</Link>
      </p>
      <h1>Fahrzeuge</h1>

      <div className="karte">
        <h2>Fahrzeuge &amp; Sitzplätze</h2>
        <p className="text-mute">
          Fahrzeuge anlegen, Sitzplätze für die Einsatz-Garage einrichten und festlegen, welche
          Fahrzeuge für die Fahrzeugbuchung „buchbar" sind.
        </p>
        <FahrzeugeVerwaltung />
      </div>
    </div>
  );
}
