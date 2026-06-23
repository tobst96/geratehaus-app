import { apiGet, apiPost } from "./client";
import type { DienststundenSummeOut } from "./types";

export interface DienststundenEintragOut {
  id: number;
  person_id: number;
  funktion_id: number;
  stunden: number;
  datum: string;
}

export const stundenErfassen = (funktionId: number, stunden: number, datum: string) =>
  apiPost<DienststundenEintragOut>("/dienststunden", { funktion_id: funktionId, stunden, datum });

export const holeMeineSummen = () =>
  apiGet<DienststundenSummeOut[]>("/dienststunden/meine");

export const holeMeineSummenAussen = () => apiGet<DienststundenSummeOut[]>("/aussen/dienststunden");
