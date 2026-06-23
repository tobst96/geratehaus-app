import { apiGet, apiPost } from "./client";
import type { EinsatzOut, TeilnahmeOut } from "./types";

export const holeEinsaetze = () =>
  apiGet<EinsatzOut[]>("/einsaetze");

export const holeEinsatz = (id: number) =>
  apiGet<EinsatzOut>(`/einsaetze/${id}`);

export const einsatzAnlegen = (titel: string, zeitpunkt: string) =>
  apiPost<EinsatzOut>("/einsaetze", { titel, zeitpunkt });

export interface TeilnahmeAnlegen {
  fahrzeug_id: number | null;
  funktion_id: number | null;
  vab: boolean;
  atemschutzminuten: number;
  nur_geraetehaus: boolean;
}

export const teilnahmeEintragen = (einsatzId: number, daten: TeilnahmeAnlegen) =>
  apiPost<TeilnahmeOut>(`/einsaetze/${einsatzId}/teilnahme`, daten);

export const einsatzPdfUrl = (id: number) =>
  `/api/v1/einsaetze/${id}/pdf`;
