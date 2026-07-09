import { apiGet, apiPatch } from "./client";

export interface Modul {
  key: string;
  name: string;
  beschreibung: string;
  aktiv: boolean;
}

export const holeModule = () => apiGet<Modul[]>("/gruppenfuehrer/module");

export const setModulAktiv = (key: string, aktiv: boolean) =>
  apiPatch<Modul>(`/gruppenfuehrer/module/${encodeURIComponent(key)}`, { aktiv });
