/** Minimale JWT-Helfer fürs Frontend. Die Signatur wird NICHT geprüft (das macht
 * das Backend bei jedem Request); hier geht es nur darum, die UI-Navigation nicht
 * von einem längst abgelaufenen Token in die Irre führen zu lassen. */

function payloadLesen(token: string | null): Record<string, unknown> | null {
  if (!token) return null;
  try {
    const teil = token.split(".")[1];
    if (!teil) return null;
    const json = atob(teil.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Ist das Token vorhanden und (laut `exp`-Claim) noch nicht abgelaufen?
 * Fehlt `exp`, wird das Token als gültig behandelt (das Backend entscheidet dann);
 * ist es unlesbar/kaputt, gilt es als ungültig. */
export function tokenGueltig(token: string | null): boolean {
  const payload = payloadLesen(token);
  if (payload === null) return false;
  const exp = payload.exp;
  if (typeof exp === "number") return exp * 1000 > Date.now();
  return true;
}
