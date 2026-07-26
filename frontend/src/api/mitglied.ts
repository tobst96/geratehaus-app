import { apiGet } from "./client";

export interface DienststundenSumme {
  funktion_id: number;
  funktion_name: string;
  summe_stunden: number;
  schwellenwert_stunden: number;
  schwellenwert_ueberschritten: boolean;
}

export interface MeinEinsatzKurz {
  id: number;
  titel: string;
  zeitpunkt: string;
}

export interface MitgliedUebersicht {
  einsaetze_jahr: number;
  dienste_jahr: number;
  dienststunden: DienststundenSumme[];
  letzte_einsaetze: MeinEinsatzKurz[];
}

export const holeMitgliedUebersicht = () =>
  apiGet<MitgliedUebersicht>("/mitglied/uebersicht");
