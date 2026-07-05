import { apiGet } from "./client";

export interface Meta {
  installierte_version: string;
  docs_basis_url: string;
}

export const holeMeta = () => apiGet<Meta>("/moderator/meta");

export interface MeineBerechtigungen {
  ist_admin: boolean;
  keys: string[];
}

export const holeMeineBerechtigungen = () =>
  apiGet<MeineBerechtigungen>("/moderator/meta/meine-berechtigungen");
