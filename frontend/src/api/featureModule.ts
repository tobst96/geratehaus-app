import { apiGet, apiPatch, apiPut } from "./client";

export interface FeatureModul {
  key: string;
  name: string;
  mitgliederseitig: boolean;
  immer_aktiv: boolean;
  reihenfolge: number;
  aktiv: boolean;
  startseite: boolean | null;
  aussenzugriff: boolean | null;
}

export const holeFeatureModule = () => apiGet<FeatureModul[]>("/gruppenfuehrer/feature-module");

export const setFeatureModulFlag = (
  key: string,
  flags: Partial<Pick<FeatureModul, "aktiv" | "startseite" | "aussenzugriff">>
) => apiPatch<FeatureModul>(`/gruppenfuehrer/feature-module/${encodeURIComponent(key)}`, flags);

export const setFeatureModulReihenfolge = (keys: string[]) =>
  apiPut<FeatureModul[]>("/gruppenfuehrer/feature-module/reihenfolge", { keys });
