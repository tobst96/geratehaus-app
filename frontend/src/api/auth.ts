import { apiGet, apiPost, ApiError } from "./client";

const BASIS_URL = "/api/v1";

export interface ModeratorToken {
  access_token: string;
  token_type: string;
}

export interface ModeratorLoginErgebnis {
  access_token: string | null;
  token_type: string;
  zwei_faktor_erforderlich: boolean;
  challenge: string | null;
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
 * Moderator-Freigabe). Gibt {weg: "mail" | "freigabe"} zurück. */
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
export async function moderatorLogin(
  username: string,
  passwort: string
): Promise<ModeratorLoginErgebnis> {
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

/** Zweiter Login-Schritt bei aktivem 2FA: E-Mail-Code oder Recovery-Code. */
export async function moderator2fa(
  challenge: string,
  code: string,
  angemeldetBleiben: boolean
): Promise<ModeratorLoginErgebnis> {
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
