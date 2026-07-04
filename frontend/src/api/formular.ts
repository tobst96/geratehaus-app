import { apiDelete, apiGet, apiPost, apiPut } from "./client";

export type FormularFeldTyp =
  | "text"
  | "mehrzeilig"
  | "checkbox"
  | "sterne"
  | "dropdown"
  | "dropdown_mehrfach";

export interface FormularFeld {
  id: number;
  label: string;
  typ: FormularFeldTyp;
  pflicht: boolean;
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
  reihenfolge: number;
  felder: FormularFeld[];
}

export interface FormularOeffentlich {
  id: number;
  name: string;
  beschreibung: string | null;
  login_erforderlich: boolean;
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

export const holeFormulare = () => apiGet<Formular[]>("/moderator/formulare");
export const holeFormular = (id: number) => apiGet<Formular>(`/moderator/formulare/${id}`);
export const formularAnlegen = (daten: { name: string }) =>
  apiPost<Formular>("/moderator/formulare", daten);
export const formularAktualisieren = (id: number, daten: FormularEingabe) =>
  apiPut<Formular>(`/moderator/formulare/${id}`, daten);
export const formularLoeschen = (id: number) => apiDelete<void>(`/moderator/formulare/${id}`);

export const feldAnlegen = (formularId: number, daten: FeldEingabe) =>
  apiPost<FormularFeld>(`/moderator/formulare/${formularId}/felder`, daten);
export const feldAktualisieren = (feldId: number, daten: FeldEingabe) =>
  apiPut<FormularFeld>(`/moderator/formulare/felder/${feldId}`, daten);
export const feldLoeschen = (feldId: number) =>
  apiDelete<void>(`/moderator/formulare/felder/${feldId}`);

export const holeEinreichungen = (formularId: number) =>
  apiGet<Einreichung[]>(`/moderator/formulare/${formularId}/einreichungen`);
export const holeSichtbareFormulare = () =>
  apiGet<Formular[]>("/moderator/formulare/sichtbar");

// --- Öffentlich / Mitglied ---------------------------------------------------

export const holeOeffentlicheFormulare = () => apiGet<FormularOeffentlich[]>("/formulare");
export const holeOeffentlichesFormular = (id: number) =>
  apiGet<FormularOeffentlich>(`/formulare/${id}`);
export const formularEinreichen = (id: number, antworten: Record<string, unknown>) =>
  apiPost<{ ok: boolean; einreichung_id: number }>(`/formulare/${id}/einreichen`, { antworten });
