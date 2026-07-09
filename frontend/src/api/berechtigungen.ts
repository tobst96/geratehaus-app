import { apiGet, apiPut } from "./client";

export interface ModulKurz {
  key: string;
  name: string;
}

export interface GruppenfuehrerBerechtigung {
  id: number;
  username: string;
  rolle: string;
  ist_admin: boolean;
  module: string[];
}

export interface BerechtigungMatrix {
  module: ModulKurz[];
  moderatoren: GruppenfuehrerBerechtigung[];
}

export const holeBerechtigungen = () => apiGet<BerechtigungMatrix>("/gruppenfuehrer/berechtigungen");

export const setzeBerechtigung = (gruppenfuehrerId: number, modulKey: string, erlaubt: boolean) =>
  apiPut<void>(`/gruppenfuehrer/berechtigungen/${gruppenfuehrerId}/${encodeURIComponent(modulKey)}`, {
    erlaubt,
  });
