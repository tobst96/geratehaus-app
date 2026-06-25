import { apiGet, apiPost, apiPut } from "./client";
import type { DienstbuchReservierungInfo, Person, TeilnehmerOut } from "./types";

export const holeDienstbuchReservierung = (token: string) =>
  apiGet<DienstbuchReservierungInfo>(`/dienstbuch-reservierungen/${encodeURIComponent(token)}`);

export const holeDienstbuchReservierungPersonen = (token: string) =>
  apiGet<Person[]>(`/dienstbuch-reservierungen/${encodeURIComponent(token)}/personen`);

export const dienstbuchReservierungVorschauSetzen = (token: string, personId: number) =>
  apiPut<void>(`/dienstbuch-reservierungen/${encodeURIComponent(token)}/vorschau`, {
    person_id: personId,
  });

export interface DienstbuchReservierungEinloesen {
  person_id: number;
  gruppe_id: number | null;
}

export const dienstbuchReservierungEinloesen = (
  token: string,
  daten: DienstbuchReservierungEinloesen
) => apiPost<TeilnehmerOut>(`/dienstbuch-reservierungen/${encodeURIComponent(token)}/einloesen`, daten);
