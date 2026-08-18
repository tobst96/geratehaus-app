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
  ohne_pin: boolean;
}

export const stundenErfassen = (
  funktionId: number,
  stunden: number,
  datum: string,
  ohnePin = false
) =>
  apiPost<DienststundenEintragOut>("/dienststunden", {
    funktion_id: funktionId,
    stunden,
    datum,
    ohne_pin: ohnePin,
  });

export const holeMeineSummen = () =>
  apiGet<DienststundenSummeOut[]>("/dienststunden/meine");

export const dienststundenReservierungAnlegen = () =>
  apiPost<{ token: string; ablauf_am: string }>("/dienststunden/reservierung");
