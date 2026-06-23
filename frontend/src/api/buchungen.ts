import { apiGet, apiPost } from "./client";
import type { Position } from "../context/StandortContext";
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

export const holeBuchungen = (position: Position, von?: string, bis?: string) =>
  apiGet<BuchungOut[]>("/buchungen", { lat: position.lat, lon: position.lon, von, bis });

export const buchungAnfrage = (daten: BuchungAnfrage, position: Position) =>
  apiPost<BuchungAnfrageErgebnis>("/buchungen", daten, { lat: position.lat, lon: position.lon });

export const buchungZurueckziehen = (id: number, position: Position) =>
  apiPost<BuchungOut>(`/buchungen/${id}/zurueckziehen`, undefined, {
    lat: position.lat,
    lon: position.lon,
  });

export const holeBuchungenAussen = (von?: string, bis?: string) =>
  apiGet<BuchungOut[]>("/aussen/buchungen", { von, bis });

export const buchungAnfrageAussen = (daten: BuchungAnfrage) =>
  apiPost<BuchungAnfrageErgebnis>("/aussen/buchungen", daten);
