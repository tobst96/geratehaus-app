/** Zentrale Datums-/Uhrzeit-Formatierung in der **konfigurierten Zeitzone**
 * (app_config `zeitzone`, Default Europe/Berlin). Die DB speichert UTC; hier wird
 * für die Anzeige in die Org-Zeitzone umgerechnet – so sehen auch Mitglieder, die
 * von außerhalb (anderer Browser-Zeitzone) zugreifen, die korrekte Ortszeit der
 * Feuerwehr. Die aktive Zeitzone wird einmalig aus der öffentlichen Konfiguration
 * gesetzt (`setZeitzone`), damit die Formatierer ohne Context auskommen. */

export const STANDARD_ZEITZONE = "Europe/Berlin";

let aktiveZeitzone = STANDARD_ZEITZONE;

export function setZeitzone(tz: string | null | undefined): void {
  if (tz) aktiveZeitzone = tz;
}

function alsDate(wert: string | number | Date): Date {
  return wert instanceof Date ? wert : new Date(wert);
}

/** Datum + Uhrzeit (Ersatz für `toLocaleString("de-DE")`). */
export function formatiereDatumZeit(wert: string | number | Date): string {
  return alsDate(wert).toLocaleString("de-DE", { timeZone: aktiveZeitzone });
}

/** Nur Datum (Ersatz für `toLocaleDateString("de-DE")`). */
export function formatiereDatum(wert: string | number | Date): string {
  return alsDate(wert).toLocaleDateString("de-DE", { timeZone: aktiveZeitzone });
}

/** Nur Uhrzeit (Ersatz für `toLocaleTimeString("de-DE")`). */
export function formatiereZeit(wert: string | number | Date): string {
  return alsDate(wert).toLocaleTimeString("de-DE", { timeZone: aktiveZeitzone });
}
