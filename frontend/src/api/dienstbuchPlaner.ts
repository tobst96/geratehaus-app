import { apiDelete, apiGet, apiPatch, apiPost } from "./client";
import type {
  PlanerKategorieOut,
  PlanTerminEreignisOut,
  PlanTerminOut,
  PlanVorlageOut,
  VorlageUeberfaelligOut,
} from "./types";

// --- Kategorien ----------------------------------------------------------

export interface PlanerKategorieAnlegen {
  name: string;
  farbe: string;
  reihenfolge?: number;
  aktiv?: boolean;
}

export const holeKategorien = () =>
  apiGet<PlanerKategorieOut[]>("/dienstbuch-planer/kategorien");

export const legeKategorieAn = (daten: PlanerKategorieAnlegen) =>
  apiPost<PlanerKategorieOut>("/dienstbuch-planer/kategorien", daten);

export const aktualisiereKategorie = (id: number, daten: Partial<PlanerKategorieAnlegen>) =>
  apiPatch<PlanerKategorieOut>(`/dienstbuch-planer/kategorien/${id}`, daten);

// --- Vorlagen --------------------------------------------------------------

export interface PlanVorlageAnlegen {
  titel: string;
  beschreibung?: string | null;
  wiederholungstyp: string;
  intervall?: number | null;
  wochentag?: number | null;
  kalenderwoche?: number | null;
  kw_paritaet?: "gerade" | "ungerade" | null;
  mindest_intervall_aktiv?: boolean;
  mindest_intervall_tage?: number | null;
  startdatum: string;
  enddatum?: string | null;
  aktiv?: boolean;
  kategorie_ids?: number[];
}

export const holeVorlagen = () => apiGet<PlanVorlageOut[]>("/dienstbuch-planer/vorlagen");

export const legeVorlageAn = (daten: PlanVorlageAnlegen) =>
  apiPost<PlanVorlageOut>("/dienstbuch-planer/vorlagen", daten);

export const aktualisiereVorlage = (id: number, daten: Partial<PlanVorlageAnlegen>) =>
  apiPatch<PlanVorlageOut>(`/dienstbuch-planer/vorlagen/${id}`, daten);

export const deaktiviereVorlage = (id: number) =>
  apiDelete<PlanVorlageOut>(`/dienstbuch-planer/vorlagen/${id}`);

// --- Termine ----------------------------------------------------------------

export const holeTermine = (jahr: number) =>
  apiGet<PlanTerminOut[]>("/dienstbuch-planer/termine", { jahr });

export const stelleJahrSicher = (jahr: number) =>
  apiPost<PlanTerminOut[]>(`/dienstbuch-planer/termine/jahr/${jahr}/sicherstellen`);

export interface PlanPlatzhalterAnlegen {
  titel: string;
  beschreibung?: string | null;
  jahr: number;
  kategorie_ids?: number[];
}

export const legePlatzhalterAn = (daten: PlanPlatzhalterAnlegen) =>
  apiPost<PlanTerminOut>("/dienstbuch-planer/platzhalter", daten);

export interface PlanTerminAnlegen {
  titel: string;
  beschreibung?: string | null;
  zieldatum: string;
  uhrzeit?: string | null;
  kategorie_ids?: number[];
}

export const legeTerminAn = (daten: PlanTerminAnlegen) =>
  apiPost<PlanTerminOut>("/dienstbuch-planer/termine", daten);

export interface PlanTerminAktualisieren {
  titel?: string;
  beschreibung?: string | null;
  zieldatum?: string | null;
  uhrzeit?: string | null;
  kategorie_ids?: number[];
}

export const aktualisiereTermin = (id: number, daten: PlanTerminAktualisieren) =>
  apiPatch<PlanTerminOut>(`/dienstbuch-planer/termine/${id}`, daten);

export const bestaetigeTermin = (id: number) =>
  apiPost<PlanTerminOut>(`/dienstbuch-planer/termine/${id}/bestaetigen`);

export const setzeTerminAufEntwurf = (id: number) =>
  apiPost<PlanTerminOut>(`/dienstbuch-planer/termine/${id}/entwurf`);

export const holeTerminEreignisse = (id: number) =>
  apiGet<PlanTerminEreignisOut[]>(`/dienstbuch-planer/termine/${id}/ereignisse`);

export const holeUeberfaelligeVorlagen = () =>
  apiGet<VorlageUeberfaelligOut[]>("/dienstbuch-planer/ueberfaellig");
