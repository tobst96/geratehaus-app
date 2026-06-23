/** Reiner UX-Marker, ob die PIN-Verifizierung lokal als erfolgreich bekannt
 * ist. Hat keine Sicherheitsfunktion – die Durchsetzung erfolgt serverseitig
 * über das signierte PIN-Session-Cookie (siehe app.core.pin_session). */
export const PIN_VERIFIZIERT_KEY = "pin_verifiziert";

export function setzePinVerifiziert(): void {
  localStorage.setItem(PIN_VERIFIZIERT_KEY, "true");
}

export function istPinLokalVerifiziert(): boolean {
  return localStorage.getItem(PIN_VERIFIZIERT_KEY) === "true";
}

export function loeschePinVerifizierung(): void {
  localStorage.removeItem(PIN_VERIFIZIERT_KEY);
}
