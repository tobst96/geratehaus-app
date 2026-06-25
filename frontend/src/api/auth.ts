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

export const barcodeEinscannen = (token: string) =>
  apiPost<BarcodeIdentitaet>("/auth/barcode", { token });

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
