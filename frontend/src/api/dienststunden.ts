import { apiGet, apiPost } from "./client";
import type { DienststundenSummeOut } from "./types";

export interface DienststundenEintragOut {
  id: number;
  person_id: number;
  person_name: string;
  funktion_id: number;
  funktion_name: string;
  stunden: number;
  datum: string;
}

export const stundenErfassen = (funktionId: number, stunden: number, datum: string) =>
  apiPost<DienststundenEintragOut>("/dienststunden", { funktion_id: funktionId, stunden, datum });

export const holeMeineSummen = () =>
  apiGet<DienststundenSummeOut[]>("/dienststunden/meine");

export const dienststundenReservierungAnlegen = () =>
  apiPost<{ token: string; ablauf_am: string }>("/dienststunden/reservierung");
