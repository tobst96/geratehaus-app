import { apiGet, apiPost } from "./client";
import type { Position } from "../context/StandortContext";
import type { DienstbuchOut, TeilnehmerOut } from "./types";

export const holeLetzteDienstbuecher = (position: Position) =>
  apiGet<DienstbuchOut[]>("/dienstbuecher/letzte", { lat: position.lat, lon: position.lon });

export const holeDienstbuch = (id: number, position: Position) =>
  apiGet<DienstbuchOut>(`/dienstbuecher/${id}`, { lat: position.lat, lon: position.lon });

export const dienstbuchAnlegen = (
  titel: string,
  eroeffnetAm: string,
  notizen: string | null,
  position: Position
) =>
  apiPost<DienstbuchOut>(
    "/dienstbuecher",
    { titel, eroeffnet_am: eroeffnetAm, notizen },
    { lat: position.lat, lon: position.lon }
  );

export const teilnehmerEintragen = (dienstbuchId: number, position: Position) =>
  apiPost<TeilnehmerOut>(
    `/dienstbuecher/${dienstbuchId}/teilnehmer`,
    undefined,
    { lat: position.lat, lon: position.lon }
  );

export const dienstbuchPdfUrl = (id: number, position: Position) =>
  `/api/v1/dienstbuecher/${id}/pdf?lat=${position.lat}&lon=${position.lon}`;
