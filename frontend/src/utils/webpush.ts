/** Web-Push-Hilfen fürs Frontend-Abo. Push braucht einen Secure Context (HTTPS
 * oder localhost); über LAN-HTTP steht die Option nicht zur Verfügung. */

export function pushWirdUnterstuetzt(): boolean {
  return (
    typeof navigator !== "undefined" &&
    "serviceWorker" in navigator &&
    typeof window !== "undefined" &&
    "PushManager" in window &&
    "Notification" in window &&
    window.isSecureContext === true
  );
}

/** Wandelt den Base64URL-kodierten VAPID-Public-Key in das von
 * `pushManager.subscribe({ applicationServerKey })` erwartete Uint8Array. */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const roh = base64String.trim();
  const padding = "=".repeat((4 - (roh.length % 4)) % 4);
  const base64 = (roh + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}
