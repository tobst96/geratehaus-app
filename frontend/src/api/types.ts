export interface OeffentlicheKonfiguration {
  organisation_name: string;
  oeffentliche_basis_url: string;
  zeitzone: string;
  logo_url: string;
  logo_url_dark: string;
  farbe_primaer: string;
  farbe_akzent: string;
  impressum_verantwortliche_person: string;
  impressum_anschrift: string;
  impressum_email: string;
  impressum_telefon: string;
  impressum_zusatz: string;
  einsatz_countdown_minuten: number;
  einsatz_alle_eingetragen_minuten: number;
  modul_einsatztagebuch_aktiv: boolean;
  modul_dienstbuch_aktiv: boolean;
  modul_dienststunden_aktiv: boolean;
  modul_fahrzeugbuchung_aktiv: boolean;
  modul_formular_aktiv: boolean;
  modul_barcode_aktiv: boolean;
  kiosk_autolock_sekunden: number;
  modul_einsatztagebuch_startseite: boolean;
  modul_dienstbuch_startseite: boolean;
  modul_dienststunden_startseite: boolean;
  modul_fahrzeugbuchung_startseite: boolean;
  modul_formular_startseite: boolean;
  modul_einsatztagebuch_aussenzugriff: boolean;
  modul_dienstbuch_aussenzugriff: boolean;
  modul_dienststunden_aussenzugriff: boolean;
  modul_fahrzeugbuchung_aussenzugriff: boolean;
  modul_formular_aussenzugriff: boolean;
  fehlerberichte_aktiv: boolean;
  sentry_dsn: string;
  sentry_environment: string;
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
  issi: number | null;
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
  email: string | null;
  gruppe_id: number | null;
  funktion_id: number | null;
  pin_gesetzt: boolean;
  benachrichtigungen_aktiv: boolean;
  inaktiv: boolean;
  /** Zeitpunkt, bis zu dem der PIN-Login gesperrt ist (ISO), sonst null. */
  pin_gesperrt_bis: string | null;
}

export type AmpelStatus = "gruen" | "gelb" | "rot" | "inaktiv";

export interface AmpelEintrag {
  person_id: number;
  status: AmpelStatus;
  tage: number;
}

export interface PersonEreignis {
  id: number;
  zeitpunkt: string;
  typ: string;
  beschreibung: string;
  akteur_name: string | null;
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
  ohne_pin: boolean;
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

export interface FahrzeugbuchungReservierungInfo {
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
  adresse: string | null;
  meldung: string | null;
  einsatznummer: string | null;
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
  ohne_pin: boolean;
}

export interface DienstbuchFeldDefinition {
  id: number;
  schluessel: string;
  label: string;
  typ: "text" | "mehrzeilig" | "checkbox" | "auswahl";
  optionen: string[];
  reihenfolge: number;
  aktiv: boolean;
}

export interface DienstbuchOut {
  id: number;
  titel: string;
  eroeffnet_am: string;
  notizen: string | null;
  archiviert: boolean;
  geschlossen: boolean;
  relevant: boolean;
  zusatzfelder: Record<string, string | boolean>;
  teilnehmer: TeilnehmerOut[];
}

export interface DienststundenSummeOut {
  funktion_id: number;
  funktion_name: string;
  summe_stunden: number;
  schwellenwert_stunden: number;
  schwellenwert_ueberschritten: boolean;
}

export interface ExternerTermin {
  titel: string;
  von: string;
  bis: string;
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
  ohne_pin: boolean;
}

// --- Dienstbuch Planer -------------------------------------------------

export type PlanWiederholungstyp =
  | "jaehrlich"
  | "monatlich"
  | "alle_x_tage"
  | "alle_x_wochen"
  | "alle_x_monate"
  | "alle_x_jahre";

export type PlanTerminStatus = "entwurf" | "bestaetigt";

export interface PlanerKategorieOut {
  id: number;
  name: string;
  farbe: string;
  reihenfolge: number;
  aktiv: boolean;
}

export interface PlanVorlageOut {
  id: number;
  titel: string;
  beschreibung: string | null;
  wiederholungstyp: PlanWiederholungstyp;
  intervall: number | null;
  wochentag: number | null;
  kalenderwoche: number | null;
  kw_paritaet: "gerade" | "ungerade" | null;
  mindest_intervall_aktiv: boolean;
  mindest_intervall_tage: number | null;
  startdatum: string;
  enddatum: string | null;
  uhrzeit: string | null;
  endzeit: string | null;
  aktiv: boolean;
  kategorien: PlanerKategorieOut[];
}

export interface PlanTerminOut {
  id: number;
  vorlage_id: number | null;
  vorlage_titel: string | null;
  jahr: number;
  titel: string;
  beschreibung: string | null;
  zieldatum: string | null;
  uhrzeit: string | null;
  endzeit: string | null;
  ist_platzhalter: boolean;
  status: PlanTerminStatus;
  dienstbuch_id: number | null;
  dienstbuch_erzeugt_am: string | null;
  kategorien: PlanerKategorieOut[];
}

export interface PlanTerminEreignisOut {
  id: number;
  zeitpunkt: string;
  typ: string;
  beschreibung: string;
  akteur_name: string | null;
}

export interface VorlageUeberfaelligOut {
  vorlage_id: number;
  titel: string;
  letztes_zieldatum: string | null;
  tage_ueberfaellig: number;
}

export interface FeiertagOut {
  datum: string;
  name: string;
  quelle: "regel" | "manuell";
  id: number | null;
}

export interface DiveraUebertragungErgebnis {
  termin_id: number;
  titel: string;
  ok: boolean;
  fehler: string;
}
