/** Kleiner „✓ gespeichert"-Hinweis nach erfolgreichem Speichern – wie er in
 * mehreren Modul-Einstellungsseiten identisch verwendet wird (DRY, ein Ort). */
export function Gespeichert() {
  return <span style={{ marginLeft: 10, color: "var(--farbe-text-mute)" }}>✓ gespeichert</span>;
}
