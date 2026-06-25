import { apiGet, apiUpload } from "./client";
import type { Person } from "./types";

export interface PersonBildReservierungInfo {
  abgelaufen: boolean;
  bereits_eingeloest: boolean;
  person_name: string;
  person_bild_url: string | null;
}

export const holePersonBildReservierung = (token: string) =>
  apiGet<PersonBildReservierungInfo>(`/person-bild-reservierungen/${encodeURIComponent(token)}`);

export const personBildReservierungEinloesen = (token: string, datei: File) =>
  apiUpload<Person>(`/person-bild-reservierungen/${encodeURIComponent(token)}/upload`, datei, "datei");
