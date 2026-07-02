import { apiGet, apiPut, apiDelete } from "./client";

export interface KanalTyp {
  key: string;
  label: string;
  zielwert_label: string;
}

export interface PersonKanal {
  typ: string;
  zielwert: string;
  aktiv: boolean;
}

export const holeKanalTypen = () => apiGet<KanalTyp[]>("/moderator/kanal-typen");

export const holePersonKanaele = (personId: number) =>
  apiGet<PersonKanal[]>(`/moderator/personen/${personId}/kanaele`);

export const setzePersonKanal = (personId: number, typ: string, zielwert: string, aktiv: boolean) =>
  apiPut<PersonKanal>(`/moderator/personen/${personId}/kanaele/${encodeURIComponent(typ)}`, {
    zielwert,
    aktiv,
  });

export const loeschePersonKanal = (personId: number, typ: string) =>
  apiDelete<void>(`/moderator/personen/${personId}/kanaele/${encodeURIComponent(typ)}`);
