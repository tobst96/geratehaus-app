import { Link } from "react-router-dom";

export function FahrzeugbuchungModul() {
  return (
    <div>
      <p>
        <Link to="/moderator/module">← Zurück zu den Modulen</Link>
      </p>
      <h1>Fahrzeugbuchung</h1>

      <div className="karte" style={{ maxWidth: 640 }}>
        <h2>Fahrzeuge</h2>
        <p style={{ color: "var(--farbe-text-mute)" }}>
          Welche Fahrzeuge buchbar sind, wird unter{" "}
          <Link to="/moderator/stammdaten">Stammdaten → Fahrzeuge</Link> festgelegt (Schalter
          „buchbar"). Eingehende Buchungsanfragen werden unter{" "}
          <Link to="/moderator/buchungen">Buchungen</Link> freigegeben.
        </p>
      </div>
    </div>
  );
}
