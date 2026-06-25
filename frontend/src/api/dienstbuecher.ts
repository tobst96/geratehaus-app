import { apiGet, apiPost, apiPut } from "./client";
import type { DienstbuchOut, TeilnehmerOut } from "./types";

export const holeLetzteDienstbuecher = () =>
  apiGet<DienstbuchOut[]>("/dienstbuecher/letzte");

export const holeDienstbuch = (id: number) =>
  apiGet<DienstbuchOut>(`/dienstbuecher/${id}`);

export const dienstbuchAnlegen = (titel: string, eroeffnetAm: string, notizen: string | null) =>
  apiPost<DienstbuchOut>("/dienstbuecher", { titel, eroeffnet_am: eroeffnetAm, notizen });

export const dienstbuchReservierungAnlegen = (dienstbuchId: number) =>
  apiPost<{ token: string; ablauf_am: string }>(`/dienstbuecher/${dienstbuchId}/reservierung`);

export const teilnehmerEintragen = (
  dienstbuchId: number,
  daten: { gruppe_id: number | null; atemschutzminuten: number }
) => apiPost<TeilnehmerOut>(`/dienstbuecher/${dienstbuchId}/teilnehmer`, daten);

export const teilnehmerAktualisieren = (
  dienstbuchId: number,
  teilnehmerId: number,
  daten: { atemschutzminuten: number }
) => apiPut<TeilnehmerOut>(`/dienstbuecher/${dienstbuchId}/teilnehmer/${teilnehmerId}`, daten);

export const dienstbuchPdfUrl = (id: number) =>
  `/api/v1/dienstbuecher/${id}/pdf`;
