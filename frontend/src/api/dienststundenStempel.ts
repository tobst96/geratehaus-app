import { apiGet } from "./client";

export interface DienststundenStempelInfo {
  funktion_id: number;
  funktion_name: string;
  aktiv: boolean;
}

export const holeStempelInfo = (funktionId: number) =>
  apiGet<DienststundenStempelInfo>(`/dienststunden-stempel/${funktionId}`);
