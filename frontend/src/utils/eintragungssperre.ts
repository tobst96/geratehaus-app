// Geräte-seitige Sperre gegen mehrfaches Absenden derselben manuellen
// Eintragung (Einsatz und Dienstbuch "Barcode vergessen") über denselben
// Browser innerhalb kurzer Zeit – unabhängig vom jeweiligen Reservierungs-Token.

const COOKIE_NAME = "letzte_manuelle_eintragung";
const SPERR_MINUTEN = 15;

function leseCookie(name: string): string | null {
  const treffer = document.cookie.split("; ").find((c) => c.startsWith(`${name}=`));
  return treffer ? decodeURIComponent(treffer.split("=").slice(1).join("=")) : null;
}

/** Gibt die verbleibenden Minuten zurück, falls eine Sperre aktiv ist, sonst null. */
export function eintragungGesperrtMinuten(): number | null {
  const wert = leseCookie(COOKIE_NAME);
  if (!wert) return null;
  const letzte = new Date(wert);
  if (Number.isNaN(letzte.getTime())) return null;
  const grenze = letzte.getTime() + SPERR_MINUTEN * 60 * 1000;
  const restMs = grenze - Date.now();
  if (restMs <= 0) return null;
  return Math.ceil(restMs / 60000);
}

/** Nach erfolgreichem Absenden aufrufen, um erneute Eintragung zu sperren. */
export function eintragungVermerken(): void {
  const jetzt = new Date().toISOString();
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(jetzt)}; max-age=${
    SPERR_MINUTEN * 60
  }; path=/; samesite=lax`;
}
