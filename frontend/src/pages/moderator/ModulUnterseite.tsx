import { Link, useParams } from "react-router-dom";

// Titel je Feature-Modul (Quelle der Wahrheit ist das Backend; hier nur fürs
// Rendern der Überschrift). Der eigentliche Einstellungs-Inhalt je Modul wird
// in Phase 4 hier eingezogen.
const MODUL_TITEL: Record<string, string> = {
  einsatztagebuch: "Einsatztagebuch",
  dienstbuch: "Dienstbuch",
  dienststunden: "Dienststunden",
  fahrzeugbuchung: "Fahrzeugbuchung",
  divera: "Divera 24/7",
};

export function ModulUnterseite() {
  const { key } = useParams<{ key: string }>();
  const titel = key ? MODUL_TITEL[key] : undefined;

  if (!titel) {
    return (
      <div>
        <p>
          <Link to="/moderator/module">← Zurück zu den Modulen</Link>
        </p>
        <p className="fehlertext">Unbekanntes Modul.</p>
      </div>
    );
  }

  return (
    <div>
      <p>
        <Link to="/moderator/module">← Zurück zu den Modulen</Link>
      </p>
      <h1>{titel}</h1>
      <p style={{ color: "var(--farbe-text-mute)" }}>
        Die Einstellungen dieses Moduls werden hier gebündelt. (Inhalt folgt.)
      </p>
    </div>
  );
}
