import { apiGet, apiPatch, apiPut } from "./client";

export interface FeatureModul {
  key: string;
  name: string;
  mitgliederseitig: boolean;
  reihenfolge: number;
  aktiv: boolean;
  startseite: boolean | null;
  aussenzugriff: boolean | null;
}

export const holeFeatureModule = () => apiGet<FeatureModul[]>("/moderator/feature-module");

export const setFeatureModulFlag = (
  key: string,
  flags: Partial<Pick<FeatureModul, "aktiv" | "startseite" | "aussenzugriff">>
) => apiPatch<FeatureModul>(`/moderator/feature-module/${encodeURIComponent(key)}`, flags);

export const setFeatureModulReihenfolge = (keys: string[]) =>
  apiPut<FeatureModul[]>("/moderator/feature-module/reihenfolge", { keys });
