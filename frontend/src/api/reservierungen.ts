import { apiGet, apiPost, apiPut } from "./client";
import type { Person, ReservierungInfo, TeilnahmeOut } from "./types";

export const holeReservierung = (token: string) =>
  apiGet<ReservierungInfo>(`/reservierungen/${encodeURIComponent(token)}`);

export const holeReservierungPersonen = (token: string) =>
  apiGet<Person[]>(`/reservierungen/${encodeURIComponent(token)}/personen`);

export const reservierungVorschauSetzen = (token: string, personId: number) =>
  apiPut<void>(`/reservierungen/${encodeURIComponent(token)}/vorschau`, { person_id: personId });

export interface ReservierungEinloesen {
  person_id: number;
  vab: boolean;
  atemschutzminuten: number;
  bemerkung: string | null;
}

export const reservierungEinloesen = (token: string, daten: ReservierungEinloesen) =>
  apiPost<TeilnahmeOut>(`/reservierungen/${encodeURIComponent(token)}/einloesen`, daten);
