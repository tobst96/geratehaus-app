import { apiGet, apiPost, apiPut } from "./client";
import type { DienststundenReservierungInfo, Person } from "./types";
import type { DienststundenEintragOut } from "./dienststunden";

export const holeDienststundenReservierung = (token: string) =>
  apiGet<DienststundenReservierungInfo>(`/dienststunden-reservierungen/${encodeURIComponent(token)}`);

export const holeDienststundenReservierungPersonen = (token: string) =>
  apiGet<Person[]>(`/dienststunden-reservierungen/${encodeURIComponent(token)}/personen`);

export const dienststundenReservierungVorschauSetzen = (token: string, personId: number) =>
  apiPut<void>(`/dienststunden-reservierungen/${encodeURIComponent(token)}/vorschau`, {
    person_id: personId,
  });

export interface DienststundenReservierungEinloesen {
  person_id: number;
  funktion_id: number;
  stunden: number;
  datum: string;
}

export const dienststundenReservierungEinloesen = (
  token: string,
  daten: DienststundenReservierungEinloesen
) =>
  apiPost<DienststundenEintragOut>(
    `/dienststunden-reservierungen/${encodeURIComponent(token)}/einloesen`,
    daten
  );
