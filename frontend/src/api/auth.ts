import { apiPost, ApiError } from "./client";

const BASIS_URL = "/api/v1";

export interface ModeratorToken {
  access_token: string;
  token_type: string;
}

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
