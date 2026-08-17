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

export const holeKanalTypen = () => apiGet<KanalTyp[]>("/gruppenfuehrer/kanal-typen");

export const holePersonKanaele = (personId: number) =>
  apiGet<PersonKanal[]>(`/gruppenfuehrer/personen/${personId}/kanaele`);

export const setzePersonKanal = (personId: number, typ: string, zielwert: string, aktiv: boolean) =>
  apiPut<PersonKanal>(`/gruppenfuehrer/personen/${personId}/kanaele/${encodeURIComponent(typ)}`, {
    zielwert,
    aktiv,
  });

export const loeschePersonKanal = (personId: number, typ: string) =>
  apiDelete<void>(`/gruppenfuehrer/personen/${personId}/kanaele/${encodeURIComponent(typ)}`);

export interface EreignisTyp {
  key: string;
  label: string;
  modul: string | null;
  modul_label: string;
}

export const holeEreignisTypen = () => apiGet<EreignisTyp[]>("/gruppenfuehrer/ereignis-typen");

export const holePersonAbos = (personId: number) =>
  apiGet<string[]>(`/gruppenfuehrer/personen/${personId}/abos`);

export const setzePersonAbo = (personId: number, ereignis: string, aktiv: boolean) =>
  apiPut<void>(`/gruppenfuehrer/personen/${personId}/abos/${encodeURIComponent(ereignis)}`, { aktiv });

export interface PersonBenachrichtigung {
  person_id: number;
  ereignisse: string[];
  mail_aktiv: boolean;
}

/** Gebündelte Abo-/Mail-Übersicht aller Personen (für den Personal-Filter). */
export const holeBenachrichtigungsUebersicht = () =>
  apiGet<PersonBenachrichtigung[]>("/gruppenfuehrer/personen/benachrichtigungs-uebersicht");
