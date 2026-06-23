import { apiGet, apiPost } from "./client";
import type { BuchungOut } from "./types";

export interface BuchungAnfrage {
  fahrzeug_id: number;
  von: string;
  bis: string;
  zweck: string;
}

export interface BuchungAnfrageErgebnis {
  buchung: BuchungOut;
  konflikt_hinweis: boolean;
}

export const holeBuchungen = (von?: string, bis?: string) =>
  apiGet<BuchungOut[]>("/buchungen", { von, bis });

export const buchungAnfrage = (daten: BuchungAnfrage) =>
  apiPost<BuchungAnfrageErgebnis>("/buchungen", daten);

export const buchungZurueckziehen = (id: number) =>
  apiPost<BuchungOut>(`/buchungen/${id}/zurueckziehen`, undefined);
