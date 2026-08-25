import { apiDelete, apiGet, apiPatch, apiPost, apiUpload } from "./client";
import type {
  DiveraUebertragungErgebnis,
  FeiertagOut,
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
  uhrzeit?: string | null;
  endzeit?: string | null;
  aktiv?: boolean;
  kategorie_ids?: number[];
}

export const holeVorlagen = () => apiGet<PlanVorlageOut[]>("/dienstbuch-planer/vorlagen");

export const legeVorlageAn = (daten: PlanVorlageAnlegen) =>
  apiPost<PlanVorlageOut>("/dienstbuch-planer/vorlagen", daten);

export const aktualisiereVorlage = (id: number, daten: Partial<PlanVorlageAnlegen>) =>
  apiPatch<PlanVorlageOut>(`/dienstbuch-planer/vorlagen/${id}`, daten);

export const loescheVorlage = (id: number) =>
  apiDelete<void>(`/dienstbuch-planer/vorlagen/${id}`);

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
  endzeit?: string | null;
  kategorie_ids?: number[];
}

export const legeTerminAn = (daten: PlanTerminAnlegen) =>
  apiPost<PlanTerminOut>("/dienstbuch-planer/termine", daten);

export interface PlanTerminAktualisieren {
  titel?: string;
  beschreibung?: string | null;
  zieldatum?: string | null;
  uhrzeit?: string | null;
  endzeit?: string | null;
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

// --- Feiertage (Phase 2) ---------------------------------------------------

export const holeFeiertage = (jahr: number) =>
  apiGet<FeiertagOut[]>("/dienstbuch-planer/feiertage", { jahr });

export const holeBundeslaender = () =>
  apiGet<Record<string, string>>("/dienstbuch-planer/feiertage/bundeslaender");

export const legeFeiertagAn = (datum: string, name: string) =>
  apiPost<FeiertagOut>("/dienstbuch-planer/feiertage", { datum, name });

export const loescheFeiertag = (id: number) =>
  apiDelete<void>(`/dienstbuch-planer/feiertage/${id}`);

/** Baut die gesetzlichen Feiertage eines Jahres neu auf (nach Bundesland-Wechsel). */
export const seedeFeiertage = (jahr: number) =>
  apiPost<{ eingefuegt: number }>(`/dienstbuch-planer/feiertage/seed?jahr=${jahr}`);

// --- Excel (Phase 3) -------------------------------------------------------

export async function ladeJahresExport(jahr: number): Promise<void> {
  const blob = await apiGet<Blob>(`/dienstbuch-planer/export.xlsx?jahr=${jahr}`);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `dienstplan-${jahr}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export interface ImportErgebnis {
  angelegt: number;
  uebersprungen: number;
  fehler: { zeile: number; fehler: string }[];
}

export const importiereJahr = (jahr: number, datei: File) =>
  apiUpload<ImportErgebnis>(`/dienstbuch-planer/import?jahr=${jahr}`, datei, "datei");

// --- Divera (Phase 4) ------------------------------------------------------

export interface DiveraGruppe {
  id: number;
  name: string;
}

export interface DiveraInfo {
  aktiv: boolean;
  gruppen: DiveraGruppe[];
}

export const holeDiveraInfo = () => apiGet<DiveraInfo>("/dienstbuch-planer/divera-info");

export interface DiveraUebertragung {
  termin_ids: number[];
  gruppen_ids?: number[];
  erinnerung_minuten?: number | null;
  send_push?: boolean;
}

export const uebertrageAnDivera = (daten: DiveraUebertragung) =>
  apiPost<DiveraUebertragungErgebnis[]>("/dienstbuch-planer/divera-uebertragen", daten);
