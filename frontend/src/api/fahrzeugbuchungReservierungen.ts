import { apiGet, apiPost, apiPut } from "./client";
import type { BuchungOut, FahrzeugbuchungReservierungInfo, Person } from "./types";

export const holeFahrzeugbuchungReservierung = (token: string) =>
  apiGet<FahrzeugbuchungReservierungInfo>(`/fahrzeugbuchung-reservierungen/${encodeURIComponent(token)}`);

export const holeFahrzeugbuchungReservierungPersonen = (token: string) =>
  apiGet<Person[]>(`/fahrzeugbuchung-reservierungen/${encodeURIComponent(token)}/personen`);

export const fahrzeugbuchungReservierungVorschauSetzen = (token: string, personId: number) =>
  apiPut<void>(`/fahrzeugbuchung-reservierungen/${encodeURIComponent(token)}/vorschau`, {
    person_id: personId,
  });

export interface FahrzeugbuchungReservierungEinloesen {
  person_id: number;
  fahrzeug_id: number;
  von: string;
  bis: string;
  zweck: string;
}

export const fahrzeugbuchungReservierungEinloesen = (
  token: string,
  daten: FahrzeugbuchungReservierungEinloesen
) =>
  apiPost<BuchungOut>(`/fahrzeugbuchung-reservierungen/${encodeURIComponent(token)}/einloesen`, daten);
