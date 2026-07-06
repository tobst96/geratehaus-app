import { apiDelete, apiGet, apiPatch, apiPost, apiPut, apiUpload } from "./client";
import type {
  AmpelEintrag,
  BuchungOut,
  DienstbuchOut,
  DienststundenSummeOut,
  EinsatzFeldDefinition,
  EinsatzOut,
  Fahrzeug,
  FunktionDienststunden,
  FunktionEinsatz,
  Gruppe,
  Person,
  PersonEreignis,
  Sitzplatz,
} from "./types";
import type { DienststundenEintragOut } from "./dienststunden";

// --- Einstellungen ------------------------------------------------------

export const holeEinstellungen = () => apiGet<Record<string, unknown>>("/moderator/einstellungen");

export const schreibeEinstellungen = (werte: Record<string, unknown>) =>
  apiPut<Record<string, unknown>>("/moderator/einstellungen", werte);

export const ladeLogoHoch = (datei: File) =>
  apiUpload<{ logo_url: string }>("/moderator/einstellungen/logo", datei, "datei");

export const ladeLogoDarkHoch = (datei: File) =>
  apiUpload<{ logo_url_dark: string }>("/moderator/einstellungen/logo-dark", datei, "datei");

export const fuehreArchivierungAus = () =>
  apiPost<{ einsaetze: number; dienstbuecher: number }>("/moderator/einstellungen/archivierung-ausfuehren");

export const sendeTestmail = () => apiPost<void>("/moderator/einstellungen/email-testen");

export interface ModeratorKonto {
  id: number;
  username: string;
  rolle: string;
}

export const holeModeratoren = () =>
  apiGet<ModeratorKonto[]>("/moderator/einstellungen/moderatoren");

export const moderatorAnlegen = (username: string, passwort: string, rolle: string) =>
  apiPost<ModeratorKonto>("/moderator/einstellungen/moderatoren", { username, passwort, rolle });

export const moderatorPasswortAendern = (id: number, passwort: string) =>
  apiPut<ModeratorKonto>(`/moderator/einstellungen/moderatoren/${id}/passwort`, { passwort });

export const moderatorLoeschen = (id: number) =>
  apiDelete<void>(`/moderator/einstellungen/moderatoren/${id}`);

// --- Dashboard ------------------------------------------------------------

export interface EinsaetzeProMonat {
  monat: string;
  anzahl: number;
}
export interface SchwellenwertUeberschreitung {
  person_id: number;
  person_name: string;
  funktion_id: number;
  funktion_name: string;
  summe_stunden: number;
  schwellenwert_stunden: number;
}
export interface DashboardOut {
  einsaetze_pro_monat: EinsaetzeProMonat[];
  vab_faelle_anzahl: number;
  offene_buchungen_anzahl: number;
  schwellenwert_ueberschreitungen: SchwellenwertUeberschreitung[];
}

export const holeDashboard = () => apiGet<DashboardOut>("/moderator/dashboard");

// --- Listen ---------------------------------------------------------------

export interface EinsatzListenFilter {
  [key: string]: string | number | boolean | undefined;
  von?: string;
  bis?: string;
  fahrzeug_id?: number;
  person_id?: number;
  archiviert?: boolean;
}
export const holeEinsaetzeListe = (filter: EinsatzListenFilter) =>
  apiGet<EinsatzOut[]>("/moderator/listen/einsaetze", filter);
export const einsaetzeListePdfUrl = (filter: EinsatzListenFilter) => buildePdfUrl("/moderator/listen/einsaetze/pdf", filter);

export interface DienstbuchListenFilter {
  [key: string]: string | number | boolean | undefined;
  von?: string;
  bis?: string;
  person_id?: number;
  archiviert?: boolean;
}
export const holeDienstbuecherListe = (filter: DienstbuchListenFilter) =>
  apiGet<DienstbuchOut[]>("/moderator/listen/dienstbuecher", filter);
export const dienstbuecherListePdfUrl = (filter: DienstbuchListenFilter) =>
  buildePdfUrl("/moderator/listen/dienstbuecher/pdf", filter);

export interface DienststundenListenFilter {
  [key: string]: string | number | boolean | undefined;
  von?: string;
  bis?: string;
  person_id?: number;
  funktion_id?: number;
}
export const holeDienststundenListe = (filter: DienststundenListenFilter) =>
  apiGet<DienststundenEintragOut[]>("/moderator/listen/dienststunden", filter);
export const dienststundenListePdfUrl = (filter: DienststundenListenFilter) =>
  buildePdfUrl("/moderator/listen/dienststunden/pdf", filter);

export interface SchwellenwertEintrag {
  person_id: number;
  person_name: string;
  funktion_id: number;
  funktion_name: string;
  summe_stunden: number;
  schwellenwert_stunden: number;
  uebernommen_stunden: number;
  ueberschuss_stunden: number;
}
export const holeDienststundenSchwellenwert = () =>
  apiGet<SchwellenwertEintrag[]>("/moderator/listen/dienststunden-schwellenwert");
export const dienststundenUebernahmeEintragen = (person_id: number, funktion_id: number, stunden: number) =>
  apiPost<void>("/moderator/listen/dienststunden-schwellenwert/uebernahme", {
    person_id,
    funktion_id,
    stunden,
  });

export interface BuchungListenFilter {
  [key: string]: string | number | boolean | undefined;
  von?: string;
  bis?: string;
  fahrzeug_id?: number;
  person_id?: number;
  status?: string;
}
export const holeBuchungenListe = (filter: BuchungListenFilter) =>
  apiGet<BuchungOut[]>("/moderator/listen/buchungen", filter);
export const buchungenListePdfUrl = (filter: BuchungListenFilter) =>
  buildePdfUrl("/moderator/listen/buchungen/pdf", filter);

export interface NamensAbweichungOut {
  id: number;
  cookie_name: string;
  eingetragener_name: string;
  zeitstempel: string;
}
export const holeNamensabweichungen = () =>
  apiGet<NamensAbweichungOut[]>("/moderator/listen/namensabweichungen");

function buildePdfUrl(pfad: string, filter: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [schluessel, wert] of Object.entries(filter)) {
    if (wert !== undefined && wert !== null && wert !== "") {
      params.set(schluessel, String(wert));
    }
  }
  const query = params.toString();
  return `/api/v1${pfad}${query ? `?${query}` : ""}`;
}

// --- Stammdaten -------------------------------------------------------------

export const holeAlleFahrzeuge = () => apiGet<Fahrzeug[]>("/moderator/stammdaten/fahrzeuge");
export const fahrzeugAnlegen = (daten: { name: string; aktiv: boolean; buchbar: boolean; sitzplaetze?: Sitzplatz[] }) =>
  apiPost<Fahrzeug>("/moderator/stammdaten/fahrzeuge", daten);
export const fahrzeugAktualisieren = (
  id: number,
  daten: Partial<{ name: string; aktiv: boolean; buchbar: boolean; issi: number | null; sitzplaetze: Sitzplatz[] }>
) => apiPut<Fahrzeug>(`/moderator/stammdaten/fahrzeuge/${id}`, daten);
export const fahrzeugLoeschen = (id: number) => apiDelete<void>(`/moderator/stammdaten/fahrzeuge/${id}`);

export const holeAlleFunktionenEinsatz = () =>
  apiGet<FunktionEinsatz[]>("/moderator/stammdaten/funktionen-einsatz");
export const funktionEinsatzAnlegen = (daten: { name: string; aktiv: boolean }) =>
  apiPost<FunktionEinsatz>("/moderator/stammdaten/funktionen-einsatz", daten);
export const funktionEinsatzAktualisieren = (id: number, daten: Partial<{ name: string; aktiv: boolean }>) =>
  apiPut<FunktionEinsatz>(`/moderator/stammdaten/funktionen-einsatz/${id}`, daten);
export const funktionEinsatzLoeschen = (id: number) =>
  apiDelete<void>(`/moderator/stammdaten/funktionen-einsatz/${id}`);

export const holeAlleFunktionenDienststunden = () =>
  apiGet<FunktionDienststunden[]>("/moderator/stammdaten/funktionen-dienststunden");
export const funktionDienststundenAnlegen = (daten: {
  name: string;
  schwellenwert_stunden: number;
  aktiv: boolean;
}) => apiPost<FunktionDienststunden>("/moderator/stammdaten/funktionen-dienststunden", daten);
export const funktionDienststundenAktualisieren = (
  id: number,
  daten: Partial<{ name: string; schwellenwert_stunden: number; aktiv: boolean }>
) => apiPut<FunktionDienststunden>(`/moderator/stammdaten/funktionen-dienststunden/${id}`, daten);
export const funktionDienststundenLoeschen = (id: number) =>
  apiDelete<void>(`/moderator/stammdaten/funktionen-dienststunden/${id}`);

export const holeAlleGruppen = () => apiGet<Gruppe[]>("/moderator/stammdaten/gruppen");
export const gruppeAnlegen = (daten: { name: string; aktiv: boolean }) =>
  apiPost<Gruppe>("/moderator/stammdaten/gruppen", daten);
export const gruppeAktualisieren = (id: number, daten: Partial<{ name: string; aktiv: boolean }>) =>
  apiPut<Gruppe>(`/moderator/stammdaten/gruppen/${id}`, daten);
export const gruppeLoeschen = (id: number) => apiDelete<void>(`/moderator/stammdaten/gruppen/${id}`);

export const holeAlleEinsatzFelder = () =>
  apiGet<EinsatzFeldDefinition[]>("/moderator/stammdaten/einsatz-felder");
export const einsatzFeldAnlegen = (daten: {
  label: string;
  typ: "text" | "mehrzeilig" | "checkbox";
  reihenfolge: number;
  aktiv: boolean;
}) => apiPost<EinsatzFeldDefinition>("/moderator/stammdaten/einsatz-felder", daten);
export const einsatzFeldAktualisieren = (
  id: number,
  daten: Partial<{ label: string; typ: "text" | "mehrzeilig" | "checkbox"; reihenfolge: number; aktiv: boolean }>
) => apiPut<EinsatzFeldDefinition>(`/moderator/stammdaten/einsatz-felder/${id}`, daten);
export const einsatzFeldLoeschen = (id: number) =>
  apiDelete<void>(`/moderator/stammdaten/einsatz-felder/${id}`);

export const holeAllePersonen = () => apiGet<Person[]>("/moderator/stammdaten/personen");
export const holeAmpelUebersicht = () =>
  apiGet<AmpelEintrag[]>("/moderator/stammdaten/personen/ampel");
export const personAnlegen = (daten: {
  vorname: string;
  zwischenname: string | null;
  nachname: string;
  email?: string | null;
  gruppe_id?: number | null;
  funktion_id?: number | null;
}) => apiPost<Person>("/moderator/stammdaten/personen", daten);
export const personAktualisieren = (
  id: number,
  daten: Partial<{
    vorname: string;
    zwischenname: string | null;
    nachname: string;
    email: string | null;
    gruppe_id: number | null;
    funktion_id: number | null;
    benachrichtigungen_aktiv: boolean;
    inaktiv: boolean;
  }>
) => apiPut<Person>(`/moderator/stammdaten/personen/${id}`, daten);
export const personPinSetzen = (id: number, pin: string) =>
  apiPut<Person>(`/moderator/stammdaten/personen/${id}/pin`, { pin });
export const personPinEntsperren = (id: number) =>
  apiPost<Person>(`/moderator/stammdaten/personen/${id}/pin-entsperren`);
export const holePersonTimeline = (id: number) =>
  apiGet<PersonEreignis[]>(`/moderator/stammdaten/personen/${id}/timeline`);
export const holePersonDienststunden = (id: number) =>
  apiGet<DienststundenSummeOut[]>(`/moderator/stammdaten/personen/${id}/dienststunden`);
export const personDienststundenErfassen = (
  id: number,
  daten: { funktion_id: number; stunden: number; datum: string }
) => apiPost<DienststundenEintragOut>(`/moderator/stammdaten/personen/${id}/dienststunden`, daten);
export const personBildReservierungAnlegen = (id: number) =>
  apiPost<{ token: string; ablauf_am: string }>(`/moderator/stammdaten/personen/${id}/bild-reservierung`);
export const personBarcodePerMailSenden = (id: number) =>
  apiPost<void>(`/moderator/stammdaten/personen/${id}/barcode-mail`);
export const personLoeschen = (id: number) => apiDelete<void>(`/moderator/stammdaten/personen/${id}`);
export const personBildHochladen = (id: number, datei: File) =>
  apiUpload<Person>(`/moderator/stammdaten/personen/${id}/bild`, datei, "datei");
export const personBarcodeErzeugen = (id: number) =>
  apiPost<{ token: string; ablauf_am: string | null }>(`/moderator/barcodes/person/${id}`);

export const alleBarcodesErneuernUndSenden = () =>
  apiPost<{ gesendet: number; fehler: number }>("/moderator/barcodes/alle-erneuern-und-senden");

// --- Divera-Personal-Abgleich ------------------------------------------------

export interface DiveraVorschlagOut {
  id: number;
  divera_user_id: string;
  art: "neu" | "email_update";
  vorschlag_daten: Record<string, unknown>;
  bestehende_person_id: number | null;
  status: "offen" | "uebernommen" | "ignoriert";
  erstellt_am: string;
}

export const holeDiveraVorschlaege = () =>
  apiGet<DiveraVorschlagOut[]>("/moderator/stammdaten/personen/divera-vorschlaege");

export const diveraVorschlaegeSynchronisieren = () =>
  apiPost<DiveraVorschlagOut[]>("/moderator/stammdaten/personen/divera-vorschlaege/synchronisieren");

export const diveraVorschlagEntscheiden = (id: number, aktion: "uebernehmen" | "ignorieren") =>
  apiPost<DiveraVorschlagOut>(`/moderator/stammdaten/personen/divera-vorschlaege/${id}/entscheiden`, {
    aktion,
  });

export const diveraVorschlaegeAlleUebernehmen = () =>
  apiPost<DiveraVorschlagOut[]>("/moderator/stammdaten/personen/divera-vorschlaege/alle-uebernehmen");

export const holeIgnorierteDiveraVorschlaege = () =>
  apiGet<DiveraVorschlagOut[]>("/moderator/stammdaten/personen/divera-vorschlaege/ignoriert");

export const diveraIgnorierteZuruecksetzen = () =>
  apiPost<DiveraVorschlagOut[]>("/moderator/stammdaten/personen/divera-vorschlaege/ignorierte-zuruecksetzen");

export const barcodeBildUrl = (token: string) =>
  `/api/v1/moderator/barcodes/render/${token}`;

// --- Divera ---------------------------------------------------------------

export const diveraEinsaetzeNachholen = (tage = 1) =>
  apiPost<{ anzahl_gefunden: number; anzahl_neu: number }>(`/divera/einsaetze-nachholen?tage=${tage}`);

// --- Update (Admin) ----------------------------------------------------------

export interface UpdateStatus {
  kanal: "stable" | "beta";
  installierte_version: string;
  verfuegbare_version: string | null;
  veroeffentlicht_am: string | null;
  release_url: string | null;
  update_verfuegbar: boolean;
  fehler: string | null;
}
export interface UpdateAusloesenErgebnis {
  angefordert: boolean;
  verfuegbare_version: string | null;
  meldung: string;
}
export const holeUpdateStatus = () => apiGet<UpdateStatus>("/moderator/update");
export const updateKanalSetzen = (kanal: "stable" | "beta") =>
  apiPut<UpdateStatus>("/moderator/update/kanal", { kanal });
export const updateAusloesen = () =>
  apiPost<UpdateAusloesenErgebnis>("/moderator/update/ausloesen");

// --- Kiosk-Geräte (Admin) ---------------------------------------------------

export interface KioskTokenOut {
  id: number;
  bezeichnung: string;
  token: string;
  // null = globale Startseiten-Einstellung, sonst die pro-Kiosk gewählten Keys.
  startseite_module: string[] | null;
}

export const holeKioskTokens = () => apiGet<KioskTokenOut[]>("/moderator/barcodes/kiosk");
export const kioskTokenAnlegen = (bezeichnung: string) =>
  apiPost<KioskTokenOut>("/moderator/barcodes/kiosk", { bezeichnung });
export const kioskTokenLoeschen = (id: number) =>
  apiDelete<void>(`/moderator/barcodes/kiosk/${id}`);
export const setzeKioskStartseiteModule = (id: number, keys: string[] | null) =>
  apiPatch<KioskTokenOut>(`/moderator/barcodes/kiosk/${id}`, { startseite_module: keys });

export async function ladeKioskPdf(id: number, bezeichnung: string): Promise<void> {
  const blob = await apiGet<Blob>(`/moderator/barcodes/kiosk/${id}/pdf`);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `kiosk-${bezeichnung.replace(/[^\w.-]+/g, "_") || id}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// --- Buchungsmanagement -----------------------------------------------------

export const holeKonfliktvergleich = (buchungId: number) =>
  apiGet<BuchungOut[]>(`/moderator/buchungen/${buchungId}/konflikte`);
export const buchungGenehmigen = (buchungId: number) =>
  apiPost<BuchungOut>(`/moderator/buchungen/${buchungId}/genehmigen`);
export const buchungAblehnen = (buchungId: number, grund: string | null) =>
  apiPost<BuchungOut>(`/moderator/buchungen/${buchungId}/ablehnen`, { grund });
