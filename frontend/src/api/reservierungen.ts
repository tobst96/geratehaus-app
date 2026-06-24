import { apiGet, apiPost } from "./client";
import type { ReservierungInfo, TeilnahmeOut } from "./types";

export const holeReservierung = (token: string) =>
  apiGet<ReservierungInfo>(`/reservierungen/${encodeURIComponent(token)}`);

export interface ReservierungEinloesen {
  vorname: string;
  zwischenname: string | null;
  nachname: string;
  vab: boolean;
  atemschutzminuten: number;
  bemerkung: string | null;
}

export const reservierungEinloesen = (token: string, daten: ReservierungEinloesen) =>
  apiPost<TeilnahmeOut>(`/reservierungen/${encodeURIComponent(token)}/einloesen`, daten);
