import { apiGet, apiPatch, apiPost } from "./client";
import type { EinsatzFeldDefinition, EinsatzOut, TeilnahmeOut } from "./types";

export const holeEinsaetze = () =>
  apiGet<EinsatzOut[]>("/einsaetze");

export const holeEinsatz = (id: number) =>
  apiGet<EinsatzOut>(`/einsaetze/${id}`);

export const einsatzAnlegen = (titel: string, zeitpunkt: string) =>
  apiPost<EinsatzOut>("/einsaetze", { titel, zeitpunkt });

export const holeEinsatzFelder = () =>
  apiGet<EinsatzFeldDefinition[]>("/einsaetze/feld-definitionen");

export const einsatzZusatzfelderAktualisieren = (
  einsatzId: number,
  zusatzfelder: Record<string, string | boolean>
) => apiPatch<EinsatzOut>(`/einsaetze/${einsatzId}/zusatzfelder`, { zusatzfelder });

export interface TeilnahmeAnlegen {
  fahrzeug_id: number | null;
  sitzplatz_id: string | null;
  funktion_id: number | null;
  vab: boolean;
  atemschutzminuten: number;
  nur_geraetehaus: boolean;
  auf_anfahrt: boolean;
  bemerkung: string | null;
}

export const teilnahmeEintragen = (einsatzId: number, daten: TeilnahmeAnlegen) =>
  apiPost<TeilnahmeOut>(`/einsaetze/${einsatzId}/teilnahme`, daten);

export const einsatzPdfUrl = (id: number) =>
  `/api/v1/einsaetze/${id}/pdf`;
