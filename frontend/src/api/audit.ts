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
  apiGet<AuditEintrag[]>("/moderator/audit", {
    ...(aktion ? { aktion } : {}),
    limit,
  });
