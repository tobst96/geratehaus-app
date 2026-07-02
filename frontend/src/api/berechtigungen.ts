import { apiGet, apiPut } from "./client";

export interface ModulKurz {
  key: string;
  name: string;
}

export interface ModeratorBerechtigung {
  id: number;
  username: string;
  rolle: string;
  ist_admin: boolean;
  module: string[];
}

export interface BerechtigungMatrix {
  module: ModulKurz[];
  moderatoren: ModeratorBerechtigung[];
}

export const holeBerechtigungen = () => apiGet<BerechtigungMatrix>("/moderator/berechtigungen");

export const setzeBerechtigung = (moderatorId: number, modulKey: string, erlaubt: boolean) =>
  apiPut<void>(`/moderator/berechtigungen/${moderatorId}/${encodeURIComponent(modulKey)}`, {
    erlaubt,
  });
