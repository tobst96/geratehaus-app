import { apiGet } from "./client";

export interface Meta {
  installierte_version: string;
  docs_basis_url: string;
}

export const holeMeta = () => apiGet<Meta>("/gruppenfuehrer/meta");

export interface MeineBerechtigungen {
  ist_admin: boolean;
  keys: string[];
}

export const holeMeineBerechtigungen = () =>
  apiGet<MeineBerechtigungen>("/gruppenfuehrer/meta/meine-berechtigungen");

export interface SchedulerJob {
  id: string;
  naechster_lauf: string | null;
}

export interface SystemStatus {
  version: string;
  datenbank: { ok: boolean };
  smtp: { aktiv: boolean; konfiguriert: boolean; host: string };
  minio: { aktiv: boolean; erreichbar: boolean | null };
  divera: { modul_aktiv: boolean; api_key_gesetzt: boolean };
  scheduler: { laeuft: boolean; jobs: SchedulerJob[] };
}

export const holeSystemStatus = () => apiGet<SystemStatus>("/gruppenfuehrer/meta/systemstatus");
