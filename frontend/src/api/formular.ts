import { apiDelete, apiGet, apiPost, apiPut, apiUpload } from "./client";

export type FormularFeldTyp =
  | "text"
  | "mehrzeilig"
  | "checkbox"
  | "sterne"
  | "skala"
  | "dropdown"
  | "dropdown_mehrfach"
  | "datum"
  | "zahl"
  | "email"
  | "telefon"
  | "ja_nein"
  | "datei";

export interface FormularFeld {
  id: number;
  label: string;
  typ: FormularFeldTyp;
  pflicht: boolean;
  hinweis: string | null;
  optionen: string[];
  max_sterne: number;
  reihenfolge: number;
  aktiv: boolean;
}

export interface Formular {
  id: number;
  name: string;
  beschreibung: string | null;
  aktiv: boolean;
  login_erforderlich: boolean;
  email_empfaenger: string | null;
  moderator_sichtbar: boolean;
  start_am: string | null;
  ablauf_am: string | null;
  max_einreichungen: number | null;
  aufbewahrung_tage: number | null;
  danke_text: string | null;
  ergebnis_oeffentlich: boolean;
  einwilligung_text: string | null;
  mehrfach_verhindern: boolean;
  reihenfolge: number;
  felder: FormularFeld[];
}

export interface FeldZusammenfassung {
  feld_id: number;
  label: string;
  typ: FormularFeldTyp;
  anzahl_beantwortet: number;
  durchschnitt: number | null;
  verteilung: Record<string, number> | null;
  texte: string[] | null;
}

export interface Zusammenfassung {
  formular_id: number;
  name: string;
  anzahl_einreichungen: number;
  ablauf_am: string | null;
  felder: FeldZusammenfassung[];
}

export interface FormularOeffentlich {
  id: number;
  name: string;
  beschreibung: string | null;
  login_erforderlich: boolean;
  danke_text: string | null;
  einwilligung_text: string | null;
  ergebnis_oeffentlich: boolean;
  felder: FormularFeld[];
}

export interface EinreichungAntwort {
  feld_id: number;
  label: string;
  typ: FormularFeldTyp;
  wert: unknown;
}

export interface Einreichung {
  id: number;
  formular_id: number;
  person_id: number | null;
  person_name: string | null;
  antworten: EinreichungAntwort[];
  erstellt_am: string;
}

export type FormularEingabe = Partial<Omit<Formular, "id" | "felder">>;
export type FeldEingabe = Partial<Omit<FormularFeld, "id">> & { label: string; typ: FormularFeldTyp };

// --- Admin -------------------------------------------------------------------

export const holeFormulare = () => apiGet<Formular[]>("/gruppenfuehrer/formulare");
export const holeFormular = (id: number) => apiGet<Formular>(`/gruppenfuehrer/formulare/${id}`);
export const formularAnlegen = (daten: { name: string }) =>
  apiPost<Formular>("/gruppenfuehrer/formulare", daten);
export const formularAktualisieren = (id: number, daten: FormularEingabe) =>
  apiPut<Formular>(`/gruppenfuehrer/formulare/${id}`, daten);
export const formularLoeschen = (id: number) => apiDelete<void>(`/gruppenfuehrer/formulare/${id}`);

export const feldAnlegen = (formularId: number, daten: FeldEingabe) =>
  apiPost<FormularFeld>(`/gruppenfuehrer/formulare/${formularId}/felder`, daten);
export const feldAktualisieren = (feldId: number, daten: FeldEingabe) =>
  apiPut<FormularFeld>(`/gruppenfuehrer/formulare/felder/${feldId}`, daten);
export const feldLoeschen = (feldId: number) =>
  apiDelete<void>(`/gruppenfuehrer/formulare/felder/${feldId}`);

export const holeEinreichungen = (formularId: number) =>
  apiGet<Einreichung[]>(`/gruppenfuehrer/formulare/${formularId}/einreichungen`);
export const holeZusammenfassung = (formularId: number) =>
  apiGet<Zusammenfassung>(`/gruppenfuehrer/formulare/${formularId}/zusammenfassung`);
export const holeSichtbareFormulare = () =>
  apiGet<Formular[]>("/gruppenfuehrer/formulare/sichtbar");
export const formularDuplizieren = (id: number) =>
  apiPost<Formular>(`/gruppenfuehrer/formulare/${id}/duplizieren`);
/** CSV-Export herunterladen. Über einen authentifizierten Blob-Request (nicht als
 * <a href>, denn ein Link kann den Bearer-Token nicht mitsenden → 401). */
export async function formularCsvHerunterladen(id: number, name: string): Promise<void> {
  const blob = await apiGet<Blob>(`/gruppenfuehrer/formulare/${id}/export.csv`);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `formular-${name.replace(/[^\w.-]+/g, "_") || id}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// --- Öffentlich / Mitglied ---------------------------------------------------

export const holeOeffentlicheFormulare = () => apiGet<FormularOeffentlich[]>("/formulare");
export const holeOeffentlichesFormular = (id: number) =>
  apiGet<FormularOeffentlich>(`/formulare/${id}`);
export const holeOeffentlichesErgebnis = (id: number) =>
  apiGet<Zusammenfassung>(`/formulare/${id}/ergebnis`);
export const formularDateiHochladen = (id: number, datei: File) =>
  apiUpload<{ referenz: string }>(`/formulare/${id}/datei`, datei);
export const formularEinreichen = (
  id: number,
  antworten: Record<string, unknown>,
  extra?: { einwilligung?: boolean; hp?: string }
) =>
  apiPost<{ ok: boolean; einreichung_id: number }>(`/formulare/${id}/einreichen`, {
    antworten,
    einwilligung: extra?.einwilligung ?? false,
    hp: extra?.hp ?? "",
  });
