import { apiDelete, apiGet, apiPatch, apiPost, apiPut, apiUpload } from "./client";
import type {
  AmpelEintrag,
  BuchungOut,
  DienstbuchFeldDefinition,
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

export const holeEinstellungen = () => apiGet<Record<string, unknown>>("/gruppenfuehrer/einstellungen");

export const schreibeEinstellungen = (werte: Record<string, unknown>) =>
  apiPut<Record<string, unknown>>("/gruppenfuehrer/einstellungen", werte);

export const ladeLogoHoch = (datei: File) =>
  apiUpload<{ logo_url: string }>("/gruppenfuehrer/einstellungen/logo", datei, "datei");

export const ladeLogoDarkHoch = (datei: File) =>
  apiUpload<{ logo_url_dark: string }>("/gruppenfuehrer/einstellungen/logo-dark", datei, "datei");

export const fuehreArchivierungAus = () =>
  apiPost<{ einsaetze: number; dienstbuecher: number }>("/gruppenfuehrer/einstellungen/archivierung-ausfuehren");

export const sendeTestmail = () => apiPost<void>("/gruppenfuehrer/einstellungen/email-testen");

/** Erzeugt serverseitig ein gültiges VAPID-Schlüsselpaar für Web-Push und
 * speichert es. Gibt die neuen Schlüssel (Base64url) zurück. */
export const generiereVapidSchluessel = () =>
  apiPost<{ public_key: string; private_key: string }>(
    "/gruppenfuehrer/einstellungen/vapid-generieren"
  );

export const sendeTestdruck = () => apiPost<void>("/gruppenfuehrer/einstellungen/testdruck");

// --- Erhöhte Zugänge (Person = Konto): Admin/Gruppenführer an der Person -----
// Verwaltet direkt in Personal; die separate „Gruppenführer"-Verwaltung entfällt.

export type ElevatedRolle = "admin" | "gruppenfuehrer";

export interface ElevatedPerson {
  id: number;
  name: string;
  gruppenfuehrer_rolle: string | null;
  email: string | null;
  benachrichtigungen_aktiv: boolean;
  zwei_faktor_aktiv: boolean;
}

/** Alle Personen mit erhöhtem Zugang (Admin/Gruppenführer). Nur für Admins. */
export const holeElevatedPersonen = () =>
  apiGet<ElevatedPerson[]>("/gruppenfuehrer/stammdaten/elevated");

/** Person auf Admin/Gruppenführer heben oder Rolle ändern. `passwort` ist
 * Pflicht, solange die Person noch kein Login-Passwort hat. */
export const personElevieren = (id: number, rolle: ElevatedRolle, passwort?: string) =>
  apiPut<ElevatedPerson>(`/gruppenfuehrer/stammdaten/personen/${id}/elevation`, { rolle, passwort });

/** Erhöhten Zugang entziehen (Person bleibt normales Mitglied). */
export const personDeElevieren = (id: number) =>
  apiDelete<void>(`/gruppenfuehrer/stammdaten/personen/${id}/elevation`);

/** Login-Passwort einer elevated Person neu setzen. */
export const personPasswortSetzen = (id: number, passwort: string) =>
  apiPut<void>(`/gruppenfuehrer/stammdaten/personen/${id}/passwort-setzen`, { passwort });

/** Admin-Reset der 2FA einer Person (hebt Aussperren auf). */
export const person2faZuruecksetzen = (id: number) =>
  apiPost<void>(`/gruppenfuehrer/stammdaten/personen/${id}/2fa-zuruecksetzen`);

// --- Eigenes Konto: Zwei-Faktor (jeder Gruppenführer, auch Gruppenführer) --------
export interface ZweiFaktorStatus {
  aktiv: boolean;
  email_gesetzt: boolean;
}

export const holeZweiFaktorStatus = () =>
  apiGet<ZweiFaktorStatus>("/gruppenfuehrer/konto/2fa");

export const zweiFaktorAktivieren = () =>
  apiPost<{ codes: string[] }>("/gruppenfuehrer/konto/2fa/aktivieren");

export const zweiFaktorRecoveryNeu = () =>
  apiPost<{ codes: string[] }>("/gruppenfuehrer/konto/2fa/recovery-codes-neu");

export const zweiFaktorDeaktivieren = () =>
  apiPost<void>("/gruppenfuehrer/konto/2fa/deaktivieren");

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
  /** True nur für den eingeloggten erhöhten Zugang ohne gepflegten Vornamen
   * (Alt-Instanzen mit dem anonymen Platzhalter-Admin). */
  migration_hinweis: boolean;
}

export const holeDashboard = () => apiGet<DashboardOut>("/gruppenfuehrer/dashboard");

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
  apiGet<EinsatzOut[]>("/gruppenfuehrer/listen/einsaetze", filter);
export const einsaetzeListePdfUrl = (filter: EinsatzListenFilter) => buildePdfUrl("/gruppenfuehrer/listen/einsaetze/pdf", filter);

export interface DienstbuchListenFilter {
  [key: string]: string | number | boolean | undefined;
  von?: string;
  bis?: string;
  person_id?: number;
  archiviert?: boolean;
}
export const holeDienstbuecherListe = (filter: DienstbuchListenFilter) =>
  apiGet<DienstbuchOut[]>("/gruppenfuehrer/listen/dienstbuecher", filter);
export const dienstbuecherListePdfUrl = (filter: DienstbuchListenFilter) =>
  buildePdfUrl("/gruppenfuehrer/listen/dienstbuecher/pdf", filter);

export interface DienststundenListenFilter {
  [key: string]: string | number | boolean | undefined;
  von?: string;
  bis?: string;
  person_id?: number;
  funktion_id?: number;
}
export const holeDienststundenListe = (filter: DienststundenListenFilter) =>
  apiGet<DienststundenEintragOut[]>("/gruppenfuehrer/listen/dienststunden", filter);
export const dienststundenListePdfUrl = (filter: DienststundenListenFilter) =>
  buildePdfUrl("/gruppenfuehrer/listen/dienststunden/pdf", filter);

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
  apiGet<SchwellenwertEintrag[]>("/gruppenfuehrer/listen/dienststunden-schwellenwert");
export const dienststundenUebernahmeEintragen = (person_id: number, funktion_id: number, stunden: number) =>
  apiPost<void>("/gruppenfuehrer/listen/dienststunden-schwellenwert/uebernahme", {
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
  apiGet<BuchungOut[]>("/gruppenfuehrer/listen/buchungen", filter);
export const buchungenListePdfUrl = (filter: BuchungListenFilter) =>
  buildePdfUrl("/gruppenfuehrer/listen/buchungen/pdf", filter);

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

export const holeAlleFahrzeuge = () => apiGet<Fahrzeug[]>("/gruppenfuehrer/stammdaten/fahrzeuge");
export const fahrzeugAnlegen = (daten: { name: string; aktiv: boolean; buchbar: boolean; sitzplaetze?: Sitzplatz[] }) =>
  apiPost<Fahrzeug>("/gruppenfuehrer/stammdaten/fahrzeuge", daten);
export const fahrzeugAktualisieren = (
  id: number,
  daten: Partial<{ name: string; aktiv: boolean; buchbar: boolean; issi: number | null; sitzplaetze: Sitzplatz[] }>
) => apiPut<Fahrzeug>(`/gruppenfuehrer/stammdaten/fahrzeuge/${id}`, daten);
export const fahrzeugLoeschen = (id: number) => apiDelete<void>(`/gruppenfuehrer/stammdaten/fahrzeuge/${id}`);

export const holeAlleFunktionenEinsatz = () =>
  apiGet<FunktionEinsatz[]>("/gruppenfuehrer/stammdaten/funktionen-einsatz");
export const funktionEinsatzAnlegen = (daten: { name: string; aktiv: boolean }) =>
  apiPost<FunktionEinsatz>("/gruppenfuehrer/stammdaten/funktionen-einsatz", daten);
export const funktionEinsatzAktualisieren = (id: number, daten: Partial<{ name: string; aktiv: boolean }>) =>
  apiPut<FunktionEinsatz>(`/gruppenfuehrer/stammdaten/funktionen-einsatz/${id}`, daten);
export const funktionEinsatzLoeschen = (id: number) =>
  apiDelete<void>(`/gruppenfuehrer/stammdaten/funktionen-einsatz/${id}`);

export const holeAlleFunktionenDienststunden = () =>
  apiGet<FunktionDienststunden[]>("/gruppenfuehrer/stammdaten/funktionen-dienststunden");
export const funktionDienststundenAnlegen = (daten: {
  name: string;
  schwellenwert_stunden: number;
  aktiv: boolean;
}) => apiPost<FunktionDienststunden>("/gruppenfuehrer/stammdaten/funktionen-dienststunden", daten);
export const funktionDienststundenAktualisieren = (
  id: number,
  daten: Partial<{ name: string; schwellenwert_stunden: number; aktiv: boolean }>
) => apiPut<FunktionDienststunden>(`/gruppenfuehrer/stammdaten/funktionen-dienststunden/${id}`, daten);
export const funktionDienststundenLoeschen = (id: number) =>
  apiDelete<void>(`/gruppenfuehrer/stammdaten/funktionen-dienststunden/${id}`);

export const holeAlleGruppen = () => apiGet<Gruppe[]>("/gruppenfuehrer/stammdaten/gruppen");
export const gruppeAnlegen = (daten: { name: string; aktiv: boolean }) =>
  apiPost<Gruppe>("/gruppenfuehrer/stammdaten/gruppen", daten);
export const gruppeAktualisieren = (id: number, daten: Partial<{ name: string; aktiv: boolean }>) =>
  apiPut<Gruppe>(`/gruppenfuehrer/stammdaten/gruppen/${id}`, daten);
export const gruppeLoeschen = (id: number) => apiDelete<void>(`/gruppenfuehrer/stammdaten/gruppen/${id}`);

export const holeAlleEinsatzFelder = () =>
  apiGet<EinsatzFeldDefinition[]>("/gruppenfuehrer/stammdaten/einsatz-felder");
export const einsatzFeldAnlegen = (daten: {
  label: string;
  typ: "text" | "mehrzeilig" | "checkbox";
  reihenfolge: number;
  aktiv: boolean;
}) => apiPost<EinsatzFeldDefinition>("/gruppenfuehrer/stammdaten/einsatz-felder", daten);
export const einsatzFeldAktualisieren = (
  id: number,
  daten: Partial<{ label: string; typ: "text" | "mehrzeilig" | "checkbox"; reihenfolge: number; aktiv: boolean }>
) => apiPut<EinsatzFeldDefinition>(`/gruppenfuehrer/stammdaten/einsatz-felder/${id}`, daten);
export const einsatzFeldLoeschen = (id: number) =>
  apiDelete<void>(`/gruppenfuehrer/stammdaten/einsatz-felder/${id}`);

export const holeAlleDienstbuchFelder = () =>
  apiGet<DienstbuchFeldDefinition[]>("/gruppenfuehrer/stammdaten/dienstbuch-felder");
export const dienstbuchFeldAnlegen = (daten: {
  label: string;
  typ: DienstbuchFeldDefinition["typ"];
  optionen: string[];
  reihenfolge: number;
  aktiv: boolean;
}) => apiPost<DienstbuchFeldDefinition>("/gruppenfuehrer/stammdaten/dienstbuch-felder", daten);
export const dienstbuchFeldAktualisieren = (
  id: number,
  daten: Partial<{
    label: string;
    typ: DienstbuchFeldDefinition["typ"];
    optionen: string[];
    reihenfolge: number;
    aktiv: boolean;
  }>
) => apiPut<DienstbuchFeldDefinition>(`/gruppenfuehrer/stammdaten/dienstbuch-felder/${id}`, daten);
export const dienstbuchFeldLoeschen = (id: number) =>
  apiDelete<void>(`/gruppenfuehrer/stammdaten/dienstbuch-felder/${id}`);

export const holeAllePersonen = () => apiGet<Person[]>("/gruppenfuehrer/stammdaten/personen");
export const holeAmpelUebersicht = () =>
  apiGet<AmpelEintrag[]>("/gruppenfuehrer/stammdaten/personen/ampel");
export const personAnlegen = (daten: {
  vorname: string;
  zwischenname: string | null;
  nachname: string;
  email?: string | null;
  gruppe_id?: number | null;
  funktion_id?: number | null;
}) => apiPost<Person>("/gruppenfuehrer/stammdaten/personen", daten);
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
) => apiPut<Person>(`/gruppenfuehrer/stammdaten/personen/${id}`, daten);
export const personPinSetzen = (id: number, pin: string) =>
  apiPut<Person>(`/gruppenfuehrer/stammdaten/personen/${id}/pin`, { pin });
export const personPinEntsperren = (id: number) =>
  apiPost<Person>(`/gruppenfuehrer/stammdaten/personen/${id}/pin-entsperren`);

export interface PersonCsvImportErgebnis {
  angelegt: number;
  fehler: { zeile: number; fehler: string }[];
}
export const personenCsvImportieren = (datei: File) =>
  apiUpload<PersonCsvImportErgebnis>("/gruppenfuehrer/stammdaten/personen/csv-import", datei);
/** Beispiel-CSV herunterladen. Authentifizierter Blob-Request (nicht als <a href>,
 * da der Bearer-Token sonst nicht mitgeht → 401). */
export async function personenCsvVorlageHerunterladen(): Promise<void> {
  const blob = await apiGet<Blob>("/gruppenfuehrer/stammdaten/personen/csv-vorlage");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "personen-vorlage.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
export const holePersonTimeline = (id: number) =>
  apiGet<PersonEreignis[]>(`/gruppenfuehrer/stammdaten/personen/${id}/timeline`);
export const holePersonDienststunden = (id: number) =>
  apiGet<DienststundenSummeOut[]>(`/gruppenfuehrer/stammdaten/personen/${id}/dienststunden`);
export const personDienststundenErfassen = (
  id: number,
  daten: { funktion_id: number; stunden: number; datum: string }
) => apiPost<DienststundenEintragOut>(`/gruppenfuehrer/stammdaten/personen/${id}/dienststunden`, daten);
export const personBildReservierungAnlegen = (id: number) =>
  apiPost<{ token: string; ablauf_am: string }>(`/gruppenfuehrer/stammdaten/personen/${id}/bild-reservierung`);
export const personBarcodePerMailSenden = (id: number) =>
  apiPost<void>(`/gruppenfuehrer/stammdaten/personen/${id}/barcode-mail`);
export const personLoeschen = (id: number) => apiDelete<void>(`/gruppenfuehrer/stammdaten/personen/${id}`);
export const personBildHochladen = (id: number, datei: File) =>
  apiUpload<Person>(`/gruppenfuehrer/stammdaten/personen/${id}/bild`, datei, "datei");
export const personBarcodeErzeugen = (id: number) =>
  apiPost<{ token: string; ablauf_am: string | null }>(`/gruppenfuehrer/barcodes/person/${id}`);

export const alleBarcodesErneuernUndSenden = () =>
  apiPost<{ gesendet: number; fehler: number }>("/gruppenfuehrer/barcodes/alle-erneuern-und-senden");

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
  apiGet<DiveraVorschlagOut[]>("/gruppenfuehrer/stammdaten/personen/divera-vorschlaege");

export const diveraVorschlaegeSynchronisieren = () =>
  apiPost<DiveraVorschlagOut[]>("/gruppenfuehrer/stammdaten/personen/divera-vorschlaege/synchronisieren");

export const diveraVorschlagEntscheiden = (id: number, aktion: "uebernehmen" | "ignorieren") =>
  apiPost<DiveraVorschlagOut>(`/gruppenfuehrer/stammdaten/personen/divera-vorschlaege/${id}/entscheiden`, {
    aktion,
  });

export const diveraVorschlaegeAlleUebernehmen = () =>
  apiPost<DiveraVorschlagOut[]>("/gruppenfuehrer/stammdaten/personen/divera-vorschlaege/alle-uebernehmen");

export const holeIgnorierteDiveraVorschlaege = () =>
  apiGet<DiveraVorschlagOut[]>("/gruppenfuehrer/stammdaten/personen/divera-vorschlaege/ignoriert");

export const diveraIgnorierteZuruecksetzen = () =>
  apiPost<DiveraVorschlagOut[]>("/gruppenfuehrer/stammdaten/personen/divera-vorschlaege/ignorierte-zuruecksetzen");

export const barcodeBildUrl = (token: string) =>
  `/api/v1/gruppenfuehrer/barcodes/render/${token}`;

// --- Divera ---------------------------------------------------------------

export const diveraEinsaetzeNachholen = (tage = 1) =>
  apiPost<{ anzahl_gefunden: number; anzahl_neu: number }>(`/divera/einsaetze-nachholen?tage=${tage}`);

// --- Update (Admin) ----------------------------------------------------------

export interface UpdateStatus {
  kanal: "stable" | "beta";
  installierte_version: string;
  verfuegbare_version: string | null;
  ziel_tag: string | null;
  veroeffentlicht_am: string | null;
  release_url: string | null;
  /** Nur true, wenn die verfügbare Version echt neuer ist (kein automatischer Downgrade-Vorschlag). */
  update_verfuegbar: boolean;
  /** True, sobald sich verfuegbare_version von installierte_version unterscheidet – auch bei
   * einem Kanalwechsel auf eine ältere Version (dann lässt sich trotzdem gezielt installieren). */
  installierbar: boolean;
  fehler: string | null;
}
export interface UpdateAusloesenErgebnis {
  angefordert: boolean;
  verfuegbare_version: string | null;
  meldung: string;
}
export const holeUpdateStatus = () => apiGet<UpdateStatus>("/gruppenfuehrer/update");
export const updateKanalSetzen = (kanal: "stable" | "beta") =>
  apiPut<UpdateStatus>("/gruppenfuehrer/update/kanal", { kanal });
export const updateAusloesen = () =>
  apiPost<UpdateAusloesenErgebnis>("/gruppenfuehrer/update/ausloesen");

// --- Kiosk-Geräte (Admin) ---------------------------------------------------

export interface KioskTokenOut {
  id: number;
  bezeichnung: string;
  token: string;
  // null = globale Startseiten-Einstellung, sonst die pro-Kiosk gewählten Keys.
  startseite_module: string[] | null;
}

export const holeKioskTokens = () => apiGet<KioskTokenOut[]>("/gruppenfuehrer/barcodes/kiosk");
export const kioskTokenAnlegen = (bezeichnung: string) =>
  apiPost<KioskTokenOut>("/gruppenfuehrer/barcodes/kiosk", { bezeichnung });
export const kioskTokenLoeschen = (id: number) =>
  apiDelete<void>(`/gruppenfuehrer/barcodes/kiosk/${id}`);
export const setzeKioskStartseiteModule = (id: number, keys: string[] | null) =>
  apiPatch<KioskTokenOut>(`/gruppenfuehrer/barcodes/kiosk/${id}`, { startseite_module: keys });

async function pdfHerunterladen(pfad: string, dateiname: string): Promise<void> {
  const blob = await apiGet<Blob>(pfad);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = dateiname;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const ladeKioskPdf = (id: number, bezeichnung: string) =>
  pdfHerunterladen(`/gruppenfuehrer/barcodes/kiosk/${id}/pdf`, `kiosk-${bezeichnung.replace(/[^\w.-]+/g, "_") || id}.pdf`);

export const ladeFunktionStempelPdf = (id: number, name: string) =>
  pdfHerunterladen(
    `/gruppenfuehrer/stammdaten/funktionen-dienststunden/${id}/pdf`,
    `dienststunden-stempel-${name.replace(/[^\w.-]+/g, "_") || id}.pdf`
  );

// --- Buchungsmanagement -----------------------------------------------------

export const holeKonfliktvergleich = (buchungId: number) =>
  apiGet<BuchungOut[]>(`/gruppenfuehrer/buchungen/${buchungId}/konflikte`);
export const buchungGenehmigen = (buchungId: number) =>
  apiPost<BuchungOut>(`/gruppenfuehrer/buchungen/${buchungId}/genehmigen`);
export const buchungAblehnen = (buchungId: number, grund: string | null) =>
  apiPost<BuchungOut>(`/gruppenfuehrer/buchungen/${buchungId}/ablehnen`, { grund });
