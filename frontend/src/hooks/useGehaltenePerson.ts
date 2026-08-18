import { useRef, useState } from "react";

interface GehaltenePerson {
  name: string;
  bild_url: string | null;
}

/** Hält eine per Scan/PIN bestätigte Person mindestens `mindestMs` sichtbar
 * (Kiosk-UX: das Bestätigungsfoto soll gut lesbar bleiben), auch wenn der
 * Formular-Reset nach erfolgreicher Eintragung schneller kommt als ein
 * Mensch lesen kann. `zeigen()` bei jeder neuen Bestätigung aufrufen,
 * `graceClear()` bei einem automatischen System-Reset (z. B. nach dem
 * Absenden), `forceClear()` wenn der Bediener aktiv eine neue Eingabe
 * beginnt (kein Warten nötig). Eine `generation`-Zählung verhindert, dass
 * ein verspäteter graceClear() eine inzwischen neu gezeigte Person löscht. */
export function useGehaltenePerson(mindestMs = 5000) {
  const [gehalten, setGehalten] = useState<GehaltenePerson | null>(null);
  const seit = useRef<number | null>(null);
  const generation = useRef(0);

  function zeigen(person: GehaltenePerson): void {
    generation.current += 1;
    seit.current = Date.now();
    setGehalten(person);
  }

  function graceClear(): void {
    generation.current += 1;
    const meineGeneration = generation.current;
    const start = seit.current;
    seit.current = null;
    if (start === null) {
      setGehalten(null);
      return;
    }
    const rest = Math.max(0, mindestMs - (Date.now() - start));
    if (rest <= 0) {
      setGehalten(null);
      return;
    }
    setTimeout(() => {
      if (generation.current === meineGeneration) setGehalten(null);
    }, rest);
  }

  function forceClear(): void {
    generation.current += 1;
    seit.current = null;
    setGehalten(null);
  }

  return { gehalten, zeigen, graceClear, forceClear };
}
