import { apiGet } from "./client";

export interface AuditEintrag {
  id: number;
  zeitpunkt: string;
  akteur: string;
  aktion: string;
  objekt_typ: string;
  objekt_id: number | null;
  details: string | null;
}

export const holeAuditLog = (aktion?: string, limit = 200) =>
  apiGet<AuditEintrag[]>("/gruppenfuehrer/audit", {
    ...(aktion ? { aktion } : {}),
    limit,
  });

export async function exportiereAuditLog(format: "csv" | "json", aktion?: string): Promise<void> {
  const blob = await apiGet<Blob>("/gruppenfuehrer/audit/export", {
    format,
    ...(aktion ? { aktion } : {}),
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `audit-log.${format}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
