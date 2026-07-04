import { apiGet } from "./client";

export interface Meta {
  installierte_version: string;
  docs_basis_url: string;
}

export const holeMeta = () => apiGet<Meta>("/moderator/meta");
