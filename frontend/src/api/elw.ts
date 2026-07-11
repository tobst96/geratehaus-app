import { apiGet, apiUpload } from "./client";

export interface ElwEinsatzInfo {
  einsatz_id: number;
  titel: string;
  zeitpunkt: string | null;
}

// Token ist bereits URL-sicher (itsdangerous); encodeURIComponent schützt zusätzlich
// gegen unerwartete Zeichen, ohne die zulässigen (`.`, `-`, `_`) zu verändern.
export const holeElwEinsatz = (token: string) =>
  apiGet<ElwEinsatzInfo>(`/elw/${encodeURIComponent(token)}`);

export const elwDateiHochladen = (token: string, datei: File) =>
  apiUpload<{ ok: boolean; dateiname: string }>(`/elw/${encodeURIComponent(token)}/upload`, datei);
