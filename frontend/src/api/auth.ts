import { apiGet, apiPost, ApiError } from "./client";

const BASIS_URL = "/api/v1";

export interface GruppenfuehrerToken {
  access_token: string;
  token_type: string;
}

export interface GruppenfuehrerLoginErgebnis {
  access_token: string | null;
  token_type: string;
  zwei_faktor_erforderlich: boolean;
  /** Pflicht-2FA: Zugang muss 2FA jetzt erzwungen einrichten (kein Token). */
  einrichtung_erforderlich: boolean;
  email_gesetzt: boolean;
  challenge: string | null;
}

export interface Gruppenfuehrer2FAEinrichtenErgebnis {
  recovery_codes: string[];
  challenge: string;
}

export interface BarcodeIdentitaet {
  name: string;
}

export interface BarcodeVorschau {
  name: string;
  bild_url: string | null;
  gruppe_id: number | null;
  funktion_id: number | null;
}

export interface MeinProfil {
  name: string;
  bild_url: string | null;
  gruppe_id: number | null;
  funktion_id: number | null;
}

export interface PersonAuswahl {
  id: number;
  name: string;
  bild_url: string | null;
  pin_gesetzt: boolean;
  funktion_id: number | null;
  gruppe_id: number | null;
}

export interface NamePinVorschau {
  name: string;
  bild_url: string | null;
}

export const barcodeEinscannen = (token: string) =>
  apiPost<BarcodeIdentitaet>("/auth/barcode", { token });

/** Personenauswahl für den Kiosk (nur wenn das Barcode-Modul AUS ist). */
export const personenAuswahl = (suche: string) =>
  apiGet<PersonAuswahl[]>(`/auth/personen?suche=${encodeURIComponent(suche)}`);

/** Login per Auswahl + PIN. Wirft ApiError(428, "kein_pin"), wenn die Person
 * noch keinen PIN gesetzt hat – dann „PIN anfordern" anbieten. */
export const namePinLogin = (personId: number, pin: string) =>
  apiPost<BarcodeIdentitaet>("/auth/name-pin", { person_id: personId, pin });

/** Prüft den PIN ohne einzuloggen – für die Bildvorschau am Kiosk, sobald der
 * korrekte PIN eingegeben wurde. Wirft ApiError(401) bei falschem PIN. */
export const namePinPruefen = (personId: number, pin: string) =>
  apiPost<NamePinVorschau>("/auth/name-pin/pruefen", { person_id: personId, pin });

/** Stößt für eine Person ohne PIN den passenden Weg an (Self-Service-Mail oder
 * Gruppenführer-Freigabe). Gibt {weg: "mail" | "freigabe"} zurück. */
export const pinAnfordern = (personId: number) =>
  apiPost<{ weg: string }>("/auth/pin-anfordern", { person_id: personId });

export interface PinTokenInfo {
  name: string;
  gueltig: boolean;
}

export const pinSetzenInfo = (token: string) =>
  apiGet<PinTokenInfo>(`/pin-setzen/${encodeURIComponent(token)}`);

export const pinSetzen = (token: string, pin: string) =>
  apiPost<void>(`/pin-setzen/${encodeURIComponent(token)}`, { pin });

/** Persönlicher Mitglieder-Login per Name + Passwort (Handy/App). Setzt bei Erfolg
 * das Mitglieder-Identitäts-Cookie serverseitig und liefert den Namen. */
export const mitgliedPasswortLogin = (name: string, passwort: string) =>
  apiPost<BarcodeIdentitaet>("/auth/mitglied-login", { name, passwort });

/** Fordert einen „Passwort setzen"-Link an die zur Person hinterlegte E-Mail an.
 * Antwortet immer gleich (kein Enumeration-Leak). */
export const passwortAnfordern = (name: string) =>
  apiPost<{ status: string }>("/auth/mitglied-passwort-anfordern", { name });

export const passwortSetzenInfo = (token: string) =>
  apiGet<PinTokenInfo>(`/passwort-setzen/${encodeURIComponent(token)}`);

export const passwortSetzen = (token: string, passwort: string) =>
  apiPost<void>(`/passwort-setzen/${encodeURIComponent(token)}`, { passwort });

export interface FreigabeTokenInfo {
  name: string;
  offen: boolean;
  email: string | null;
}

export const freigabeInfo = (token: string) =>
  apiGet<FreigabeTokenInfo>(`/person-freigabe/${encodeURIComponent(token)}`);

export const freigabeFreigeben = (token: string, email: string, pin: string | null) =>
  apiPost<void>(`/person-freigabe/${encodeURIComponent(token)}/freigeben`, {
    email,
    ...(pin ? { pin } : {}),
  });

export const freigabeAblehnen = (token: string) =>
  apiPost<void>(`/person-freigabe/${encodeURIComponent(token)}/ablehnen`);

export const holeMeinProfil = () => apiGet<MeinProfil>("/auth/mein-profil");

export const mitgliedAbmelden = () => apiPost<void>("/auth/abmelden");

export const barcodeVorschau = (token: string) =>
  apiGet<BarcodeVorschau>(`/auth/barcode-vorschau/${encodeURIComponent(token)}`);

/** Eigener Aufruf statt apiPost: FastAPIs OAuth2PasswordRequestForm erwartet
 * application/x-www-form-urlencoded, nicht JSON. */
export async function gruppenfuehrerLogin(
  username: string,
  passwort: string
): Promise<GruppenfuehrerLoginErgebnis> {
  const body = new URLSearchParams({ username, password: passwort });
  const response = await fetch(`${BASIS_URL}/auth/gruppenfuehrer/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    // credentials für das httponly Trusted-Device-Cookie (2FA-Überspringen).
    credentials: "include",
    body,
  });
  if (!response.ok) {
    const daten = await response.json().catch(() => ({}));
    throw new ApiError(response.status, daten.detail ?? "Anmeldung fehlgeschlagen.");
  }
  return response.json();
}

/** Erzwungene 2FA-Einrichtung (Pflicht) im Login-Fluss: aktiviert 2FA für den per
 * `challenge` ausgewiesenen Zugang und liefert Recovery-Codes + einen neuen
 * Challenge für den anschließenden Code-Schritt. `email` nur nötig, wenn am Konto
 * noch keine hinterlegt ist. */
export async function gruppenfuehrer2faEinrichten(
  challenge: string,
  email?: string
): Promise<Gruppenfuehrer2FAEinrichtenErgebnis> {
  const response = await fetch(`${BASIS_URL}/auth/gruppenfuehrer/2fa/einrichten`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ challenge, email: email ?? null }),
  });
  if (!response.ok) {
    const daten = await response.json().catch(() => ({}));
    throw new ApiError(response.status, daten.detail ?? "2FA-Einrichtung fehlgeschlagen.");
  }
  return response.json();
}

/** Zweiter Login-Schritt bei aktivem 2FA: E-Mail-Code oder Recovery-Code. */
export async function gruppenfuehrer2fa(
  challenge: string,
  code: string,
  angemeldetBleiben: boolean
): Promise<GruppenfuehrerLoginErgebnis> {
  const response = await fetch(`${BASIS_URL}/auth/gruppenfuehrer/2fa`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ challenge, code, angemeldet_bleiben: angemeldetBleiben }),
  });
  if (!response.ok) {
    const daten = await response.json().catch(() => ({}));
    throw new ApiError(response.status, daten.detail ?? "Code ungültig.");
  }
  return response.json();
}
