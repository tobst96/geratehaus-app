/** Ob dieses Gerät als Kiosk-Tablet läuft (Token von KioskGate.tsx beim Öffnen
 * von /kiosk/:token gesetzt, siehe auch api/client.ts und useKioskAutolock). */
export function istKioskModus(): boolean {
  return localStorage.getItem("kiosk_token") !== null;
}
