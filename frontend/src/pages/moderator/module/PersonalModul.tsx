import { Link } from "react-router-dom";
import { Personal } from "../Personal";
import { GruppenVerwaltung } from "../verwaltung/GruppenVerwaltung";

export function PersonalModul() {
  return (
    <div>
      <p>
        <Link to="/moderator/module">← Zurück zu den Modulen</Link>
      </p>

      <Personal />

      <div className="karte" style={{ marginTop: 24 }}>
        <h2>Gruppen</h2>
        <p style={{ color: "var(--farbe-text-mute)" }}>
          Personengruppen (z. B. Züge/Gruppen), die Personen zugeordnet werden können.
        </p>
        <GruppenVerwaltung />
      </div>
    </div>
  );
}
