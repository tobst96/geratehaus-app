import { useRef } from "react";

/** Merkt sich den Zeitpunkt einer Bestätigung (z. B. Scan-Vorschaubild) und
 * liefert eine Wartezeit, damit eine nachfolgende Aktion (Popup schließen,
 * zu einer Erfolgsseite wechseln) erst nach mindestens `mindestMs` seit der
 * Bestätigung ausgeführt wird – Kiosk-UX: das Bestätigungsfoto soll gut
 * lesbar bleiben, auch wenn die eigentliche Aktion (API-Call) schneller
 * durch ist als ein Mensch lesen kann. */
export function useMindestwartezeit(mindestMs = 5000) {
  const seit = useRef<number | null>(null);

  function start(): void {
    if (seit.current === null) seit.current = Date.now();
  }

  function zuruecksetzen(): void {
    seit.current = null;
  }

  async function warten(): Promise<void> {
    const start = seit.current;
    seit.current = null;
    if (start === null) return;
    const rest = Math.max(0, mindestMs - (Date.now() - start));
    if (rest > 0) await new Promise((resolve) => setTimeout(resolve, rest));
  }

  return { start, zuruecksetzen, warten };
}
