import { apiGet, apiPost } from "./client";
import type { Position } from "../context/StandortContext";
import type { EinsatzOut, TeilnahmeOut } from "./types";

export const holeEinsaetze = (position: Position) =>
  apiGet<EinsatzOut[]>("/einsaetze", { lat: position.lat, lon: position.lon });

export const holeEinsatz = (id: number, position: Position) =>
  apiGet<EinsatzOut>(`/einsaetze/${id}`, { lat: position.lat, lon: position.lon });

export const einsatzAnlegen = (titel: string, zeitpunkt: string, position: Position) =>
  apiPost<EinsatzOut>("/einsaetze", { titel, zeitpunkt }, { lat: position.lat, lon: position.lon });

export interface TeilnahmeAnlegen {
  fahrzeug_id: number | null;
  funktion_id: number | null;
  vab: boolean;
  atemschutzminuten: number;
  nur_geraetehaus: boolean;
}

export const teilnahmeEintragen = (
  einsatzId: number,
  daten: TeilnahmeAnlegen,
  position: Position
) =>
  apiPost<TeilnahmeOut>(`/einsaetze/${einsatzId}/teilnahme`, daten, {
    lat: position.lat,
    lon: position.lon,
  });

export const einsatzPdfUrl = (id: number, position: Position) =>
  `/api/v1/einsaetze/${id}/pdf?lat=${position.lat}&lon=${position.lon}`;
