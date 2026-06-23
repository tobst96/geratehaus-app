import { apiGet, apiPost } from "./client";
import type { Position } from "../context/StandortContext";
import type { DienststundenSummeOut } from "./types";

export interface DienststundenEintragOut {
  id: number;
  person_id: number;
  funktion_id: number;
  stunden: number;
  datum: string;
}

export const stundenErfassen = (
  funktionId: number,
  stunden: number,
  datum: string,
  position: Position
) =>
  apiPost<DienststundenEintragOut>(
    "/dienststunden",
    { funktion_id: funktionId, stunden, datum },
    { lat: position.lat, lon: position.lon }
  );

export const holeMeineSummen = (position: Position) =>
  apiGet<DienststundenSummeOut[]>("/dienststunden/meine", { lat: position.lat, lon: position.lon });

export const holeMeineSummenAussen = () => apiGet<DienststundenSummeOut[]>("/aussen/dienststunden");
