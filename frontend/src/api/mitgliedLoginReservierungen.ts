import { apiGet, apiPost } from "./client";
import type { Person } from "./types";

export interface MitgliedLoginReservierungInfo {
  abgelaufen: boolean;
  bestaetigt: boolean;
  eingeloest: boolean;
  person_name: string | null;
  person_bild_url: string | null;
}

export const mitgliedLoginReservierungAnlegen = () =>
  apiPost<{ token: string; ablauf_am: string }>("/mitglied-login-reservierungen");

export const holeMitgliedLoginReservierung = (token: string) =>
  apiGet<MitgliedLoginReservierungInfo>(`/mitglied-login-reservierungen/${encodeURIComponent(token)}`);

export const holeMitgliedLoginReservierungPersonen = (token: string) =>
  apiGet<Person[]>(`/mitglied-login-reservierungen/${encodeURIComponent(token)}/personen`);

export const mitgliedLoginAnmelden = (token: string, personId: number, pin: string | null) =>
  apiPost<void>(`/mitglied-login-reservierungen/${encodeURIComponent(token)}/anmelden`, {
    person_id: personId,
    pin,
  });

export const mitgliedLoginEinloesen = (token: string) =>
  apiPost<{ name: string }>(`/auth/mitglied-login-reservierungen/${encodeURIComponent(token)}/einloesen`);
