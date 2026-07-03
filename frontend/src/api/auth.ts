import { apiGet, apiPost, ApiError } from "./client";

const BASIS_URL = "/api/v1";

export interface ModeratorToken {
  access_token: string;
  token_type: string;
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
  gruppe_id: number | null;
  funktion_id: number | null;
}

export interface PersonAuswahl {
  id: number;
  name: string;
  bild_url: string | null;
  pin_gesetzt: boolean;
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
export async function moderatorLogin(username: string, passwort: string): Promise<ModeratorToken> {
  const body = new URLSearchParams({ username, password: passwort });
  const response = await fetch(`${BASIS_URL}/auth/moderator/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) {
    const daten = await response.json().catch(() => ({}));
    throw new ApiError(response.status, daten.detail ?? "Anmeldung fehlgeschlagen.");
  }
  return response.json();
}
