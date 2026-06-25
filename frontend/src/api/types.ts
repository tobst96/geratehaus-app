export interface OeffentlicheKonfiguration {
  organisation_name: string;
  logo_url: string;
  farbe_primaer: string;
  farbe_akzent: string;
  einsatz_countdown_minuten: number;
  einsatz_alle_eingetragen_minuten: number;
  modul_einsatztagebuch_aktiv: boolean;
  modul_dienstbuch_aktiv: boolean;
  modul_dienststunden_aktiv: boolean;
  modul_fahrzeugbuchung_aktiv: boolean;
  modul_einsatztagebuch_startseite: boolean;
  modul_dienstbuch_startseite: boolean;
  modul_dienststunden_startseite: boolean;
  modul_fahrzeugbuchung_startseite: boolean;
}

export interface SetupStatus {
  ist_eingerichtet: boolean;
}

export interface Sitzplatz {
  id: string;
  bezeichnung: string;
  x: number;
  y: number;
  funktion_id: number | null;
}

export interface Fahrzeug {
  id: number;
  name: string;
  aktiv: boolean;
  buchbar: boolean;
  sitzplaetze: Sitzplatz[];
}

export interface FunktionEinsatz {
  id: number;
  name: string;
  aktiv: boolean;
}

export interface Person {
  id: number;
  name: string;
  vorname: string | null;
  zwischenname: string | null;
  nachname: string | null;
  bild_url: string | null;
  gruppe_id: number | null;
  funktion_id: number | null;
  gesamtpunkte: number;
}

export interface PersonEreignis {
  id: number;
  zeitpunkt: string;
  typ: string;
  beschreibung: string;
}

export interface Gruppe {
  id: number;
  name: string;
  aktiv: boolean;
}

export interface FunktionDienststunden {
  id: number;
  name: string;
  schwellenwert_stunden: number;
  aktiv: boolean;
}

export interface TeilnahmeOut {
  id: number;
  person_id: number;
  person_name: string;
  fahrzeug_id: number | null;
  fahrzeug_name: string | null;
  sitzplatz_id: string | null;
  funktion_id: number | null;
  funktion_name: string | null;
  vab: boolean;
  atemschutzminuten: number;
  nur_geraetehaus: boolean;
  auf_anfahrt: boolean;
  ohne_barcode: boolean;
  eintragung_ip: string | null;
  eintragung_user_agent: string | null;
  bemerkung: string | null;
}

export interface ReservierungInfo {
  bezeichnung: string;
  einsatz_titel: string;
  fahrzeug_name: string | null;
  abgelaufen: boolean;
  bereits_eingeloest: boolean;
  nur_geraetehaus: boolean;
  auf_anfahrt: boolean;
  vorschau_person_name: string | null;
  vorschau_bild_url: string | null;
}

export interface DienstbuchReservierungInfo {
  dienstbuch_titel: string;
  abgelaufen: boolean;
  bereits_eingeloest: boolean;
  vorschau_person_name: string | null;
  vorschau_bild_url: string | null;
}

export interface DienststundenReservierungInfo {
  abgelaufen: boolean;
  bereits_eingeloest: boolean;
  vorschau_person_name: string | null;
  vorschau_bild_url: string | null;
}

export interface EinsatzFeldDefinition {
  id: number;
  schluessel: string;
  label: string;
  typ: "text" | "mehrzeilig" | "checkbox";
  reihenfolge: number;
  aktiv: boolean;
}

export interface EinsatzOut {
  id: number;
  titel: string;
  quelle: string;
  divera_id: string | null;
  zeitpunkt: string;
  status: string;
  archiviert: boolean;
  geplanter_abschluss_am: string | null;
  zusatzfelder: Record<string, string | boolean>;
  teilnahmen: TeilnahmeOut[];
}

export interface EinsatzEreignis {
  id: number;
  zeitpunkt: string;
  typ: string;
  beschreibung: string;
}

export interface TeilnehmerOut {
  id: number;
  person_id: number;
  person_name: string;
  gruppe_id: number | null;
  gruppe_name: string | null;
  atemschutzminuten: number;
}

export interface DienstbuchOut {
  id: number;
  titel: string;
  eroeffnet_am: string;
  notizen: string | null;
  archiviert: boolean;
  geschlossen: boolean;
  teilnehmer: TeilnehmerOut[];
}

export interface DienststundenSummeOut {
  funktion_id: number;
  funktion_name: string;
  summe_stunden: number;
  schwellenwert_stunden: number;
  schwellenwert_ueberschritten: boolean;
}

export interface BuchungOut {
  id: number;
  fahrzeug_id: number;
  fahrzeug_name: string;
  von: string;
  bis: string;
  zweck: string;
  verantwortliche_person_id: number;
  verantwortliche_person_name: string;
  status: "ausstehend" | "genehmigt" | "abgelehnt" | "zurueckgezogen";
  ablehnungsgrund: string | null;
  hat_konflikt: boolean;
}
