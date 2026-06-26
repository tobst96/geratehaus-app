/** Ersetzt das bisher 29-fach duplizierte <p>Lädt …</p> durch eine
 * gemeinsame Komponente – gleicher Text/gleiches Verhalten, aber an einer
 * Stelle künftig erweiterbar (z. B. um einen Spinner), ohne jede Seite
 * einzeln anfassen zu müssen. */
export function Ladeanzeige() {
  return <p>Lädt …</p>;
}
