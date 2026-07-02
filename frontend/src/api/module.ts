import { apiGet, apiPatch } from "./client";

export interface Modul {
  key: string;
  name: string;
  beschreibung: string;
  aktiv: boolean;
}

export const holeModule = () => apiGet<Modul[]>("/moderator/module");

export const setModulAktiv = (key: string, aktiv: boolean) =>
  apiPatch<Modul>(`/moderator/module/${encodeURIComponent(key)}`, { aktiv });
