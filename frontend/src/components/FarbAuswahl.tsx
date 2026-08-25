interface FarbAuswahlProps {
  wert: string;
  onChange: (wert: string) => void;
  id?: string;
}

const HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/;

/** Einfacher Hex-Farbwähler (`<input type="color">` + Textanzeige) - im
 * Projekt bisher nicht vorhanden, für Kategorie-Farben im Dienstbuch-Planer. */
export function FarbAuswahl({ wert, onChange, id }: FarbAuswahlProps) {
  const gueltig = HEX_PATTERN.test(wert) ? wert : "#888888";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <input
        id={id}
        type="color"
        value={gueltig}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: 36, height: 28, padding: 0, border: "none", background: "none" }}
      />
      <code style={{ fontSize: "0.8rem" }}>{gueltig}</code>
    </span>
  );
}
