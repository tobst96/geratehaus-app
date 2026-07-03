import { Link } from "react-router-dom";

export function DienststundenModul() {
  return (
    <div>
      <p>
        <Link to="/moderator/module">← Zurück zu den Modulen</Link>
      </p>
      <h1>Dienststunden</h1>

      <div className="karte" style={{ maxWidth: 640 }}>
        <h2>Funktionen &amp; Schwellenwerte</h2>
        <p style={{ color: "var(--farbe-text-mute)" }}>
          Dienststunden-Funktionen und ihre Schwellenwerte werden unter{" "}
          <Link to="/moderator/stammdaten">Stammdaten → Dienststunden-Funktionen</Link> gepflegt.
          Überschreitungen erscheinen im <Link to="/moderator/dashboard">Dashboard</Link>.
        </p>
      </div>
    </div>
  );
}
