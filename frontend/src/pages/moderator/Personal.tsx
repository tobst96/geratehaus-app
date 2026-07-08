import { Fehlertext } from "../../components/Fehlertext";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { formatiereDatum,formatiereDatumZeit,formatiereZeit } from "../../utils/datum";
import QRCode from "qrcode";
import {
  holeAllePersonen,
  personAnlegen,
  personAktualisieren,
  personLoeschen,
  personBildHochladen,
  personBarcodeErzeugen,
  personBildReservierungAnlegen,
  personBarcodePerMailSenden,
  personPinSetzen,
  personPinEntsperren,
  holePersonTimeline,
  barcodeBildUrl,
  holeAlleGruppen,
  holeAlleFunktionenDienststunden,
  holeAmpelUebersicht,
  personenCsvImportieren,
  personenCsvVorlageHerunterladen,
  type PersonCsvImportErgebnis,
} from "../../api/moderator";
import { holePersonBildReservierung } from "../../api/personBildReservierungen";
import {
  holeBenachrichtigungsUebersicht,
  holeEreignisTypen,
  type EreignisTyp,
  type PersonBenachrichtigung,
} from "../../api/personKanaele";
import { ApiError } from "../../api/client";
import { useConfig } from "../../context/ConfigContext";
import { oeffentlicheBasisUrl } from "../../utils/oeffentlicheUrl";
import type {
  AmpelStatus,
  FunktionDienststunden,
  Gruppe,
  Person,
  PersonEreignis,
} from "../../api/types";
import { Ladeanzeige } from "../../components/Ladeanzeige";
import { PersonKanaele } from "./PersonKanaele";
import { PersonalEinstellungen } from "./verwaltung/PersonalEinstellungen";

interface BildQr {
  personId: number;
  token: string;
  bildUrl: string;
  ablaufAm: string;
}

// Rahmenfarbe der Personen-Kachel je Ampelstatus (gelb/rot = überfällig).
function ampelRahmen(status: AmpelStatus | undefined): { border?: string } {
  if (status === "rot") return { border: "2px solid #d64545" };
  if (status === "gelb") return { border: "2px solid #e0a500" };
  return {};
}

function ampelTitel(status: AmpelStatus | undefined): string | undefined {
  if (status === "rot") return "Überfällig – lange kein Einsatz/Dienst/Dienststunden";
  if (status === "gelb") return "Länger kein Einsatz/Dienst/Dienststunden";
  if (status === "inaktiv") return "Als inaktiv markiert – keine Ampel";
  return undefined;
}

function Initialen(vorname: string | null, nachname: string | null, name: string): string {
  if (vorname || nachname) {
    return `${(vorname ?? "").charAt(0)}${(nachname ?? "").charAt(0)}`.toUpperCase();
  }
  const teile = name.trim().split(/\s+/);
  return teile
    .slice(0, 2)
    .map((t) => t.charAt(0))
    .join("")
    .toUpperCase();
}

function PersonenAvatar({ person, groesse = 48 }: { person: Person; groesse?: number }) {
  if (person.bild_url) {
    return (
      <img
        src={person.bild_url}
        alt={person.name}
        style={{ width: groesse, height: groesse, borderRadius: "50%", objectFit: "cover" }}
      />
    );
  }
  return (
    <div
      style={{
        width: groesse,
        height: groesse,
        borderRadius: "50%",
        background: "var(--farbe-primaer)",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: groesse > 32 ? "1rem" : "0.8rem",
        flexShrink: 0,
      }}
    >
      {Initialen(person.vorname, person.nachname, person.name)}
    </div>
  );
}

async function tokenKopieren(token: string, knopf: HTMLButtonElement) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(token);
    } else {
      // navigator.clipboard ist nur in sicheren Kontexten (HTTPS) verfügbar –
      // im LAN über HTTP läuft die App ohne TLS, daher dieser Fallback.
      const textarea = document.createElement("textarea");
      textarea.value = token;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    const beschriftung = knopf.textContent;
    knopf.textContent = "Kopiert!";
    setTimeout(() => {
      knopf.textContent = beschriftung;
    }, 1500);
  } catch {
    window.prompt("Kopieren fehlgeschlagen – Text manuell kopieren:", token);
  }
}

const PERSON_EREIGNIS_ICON: Record<string, string> = {
  funktion_geaendert: "🔄",
  stammdaten_geaendert: "✏️",
  bild_geaendert: "🖼️",
  pin_gesetzt: "🔒",
  pin_gesperrt: "⛔",
  pin_entsperrt: "🔓",
  pin_zugriff_verweigert: "🚫",
  inaktivitaets_warnung: "⚠️",
  dienststunden_erfasst: "🕒",
};

// Menschliche Labels für den Verlaufs-Filter; unbekannte Typen zeigen den Rohwert.
const PERSON_EREIGNIS_LABEL: Record<string, string> = {
  funktion_geaendert: "Funktion geändert",
  stammdaten_geaendert: "Stammdaten geändert",
  bild_geaendert: "Profilbild geändert",
  pin_gesetzt: "PIN gesetzt",
  pin_gesperrt: "PIN gesperrt",
  pin_entsperrt: "PIN entsperrt",
  pin_zugriff_verweigert: "PIN-Zugriff verweigert",
  inaktivitaets_warnung: "Inaktivitäts-Warnung",
  dienststunden_erfasst: "Dienststunden erfasst",
};

function ereignisLabel(typ: string): string {
  return PERSON_EREIGNIS_LABEL[typ] ?? typ;
}

/** True, wenn der PIN-Login der Person aktuell (temporär) gesperrt ist. */
function istPinGesperrt(person: Person): boolean {
  return !!person.pin_gesperrt_bis && new Date(person.pin_gesperrt_bis).getTime() > Date.now();
}


export function Personal() {
  const { config } = useConfig();
  const [liste, setListe] = useState<Person[] | null>(null);
  const [gruppen, setGruppen] = useState<Gruppe[]>([]);
  const [funktionen, setFunktionen] = useState<FunktionDienststunden[]>([]);
  const [fehler, setFehler] = useState<string | null>(null);
  const [suche, setSuche] = useState("");
  const [filterKeineMail, setFilterKeineMail] = useState(false);
  const [filterKeinBild, setFilterKeinBild] = useState(false);
  const [filterBenachrichtigung, setFilterBenachrichtigung] = useState<"alle" | "an" | "aus">("alle");
  const [ereignisTypen, setEreignisTypen] = useState<EreignisTyp[]>([]);
  const [aboUebersicht, setAboUebersicht] = useState<Record<number, PersonBenachrichtigung>>({});
  const [ampelMap, setAmpelMap] = useState<Record<number, AmpelStatus>>({});
  const [filterAbo, setFilterAbo] = useState("");
  const [ausgewaehlteId, setAusgewaehlteId] = useState<number | null>(null);
  const bildInputRef = useRef<HTMLInputElement>(null);

  const [zeigeAnlegenModal, setZeigeAnlegenModal] = useState(false);
  const [zeigeEinstellungen, setZeigeEinstellungen] = useState(false);
  const [zeigeImportModal, setZeigeImportModal] = useState(false);
  const [importDatei, setImportDatei] = useState<File | null>(null);
  const [importErgebnis, setImportErgebnis] = useState<PersonCsvImportErgebnis | null>(null);
  const [importFehler, setImportFehler] = useState<string | null>(null);
  const [importLaeuft, setImportLaeuft] = useState(false);
  const [neuerVorname, setNeuerVorname] = useState("");
  const [neuerZwischenname, setNeuerZwischenname] = useState("");
  const [neuerNachname, setNeuerNachname] = useState("");
  const [anlegenFehler, setAnlegenFehler] = useState<string | null>(null);
  const [neuePerson, setNeuePerson] = useState<Person | null>(null);
  const [bildQr, setBildQr] = useState<BildQr | null>(null);
  const [bildHochgeladen, setBildHochgeladen] = useState(false);

  // "Bild per QR-Code hochladen" für eine bereits vorhandene Person aus der
  // Detailansicht (unabhängig vom Anlegen-Popup oben).
  const [bildQrStandalone, setBildQrStandalone] = useState<BildQr | null>(null);
  const [bildQrStandaloneHochgeladen, setBildQrStandaloneHochgeladen] = useState(false);

  const [timeline, setTimeline] = useState<PersonEreignis[] | null>(null);
  const [verlaufFilter, setVerlaufFilter] = useState("");
  const [barcode, setBarcode] = useState<{ token: string; ablaufAm: string | null } | null>(null);
  const [detailTab, setDetailTab] = useState("stammdaten");



  async function laden() {
    try {
      setListe(await holeAllePersonen());
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Personen konnten nicht geladen werden.");
    }
  }

  async function ladeAboUebersicht() {
    try {
      const rows = await holeBenachrichtigungsUebersicht();
      const map: Record<number, PersonBenachrichtigung> = {};
      for (const r of rows) map[r.person_id] = r;
      setAboUebersicht(map);
    } catch {
      setAboUebersicht({});
    }
  }

  async function ladeAmpel() {
    try {
      const rows = await holeAmpelUebersicht();
      const map: Record<number, AmpelStatus> = {};
      for (const r of rows) map[r.person_id] = r.status;
      setAmpelMap(map);
    } catch {
      setAmpelMap({});
    }
  }

  useEffect(() => {
    laden();
    ladeAboUebersicht();
    ladeAmpel();
    holeAlleGruppen().then(setGruppen).catch(() => setGruppen([]));
    holeAlleFunktionenDienststunden().then(setFunktionen).catch(() => setFunktionen([]));
    holeEreignisTypen().then(setEreignisTypen).catch(() => setEreignisTypen([]));
  }, []);

  async function timelineLaden(personId: number) {
    try {
      setTimeline(await holePersonTimeline(personId));
    } catch {
      setTimeline([]);
    }
  }

  function auswaehlen(personId: number) {
    setAusgewaehlteId(personId);
    setBarcode(null);
    setDetailTab("stammdaten");
    timelineLaden(personId);
  }

  function anlegenModalOeffnen() {
    setNeuerVorname("");
    setNeuerZwischenname("");
    setNeuerNachname("");
    setAnlegenFehler(null);
    setNeuePerson(null);
    setBildQr(null);
    setBildHochgeladen(false);
    setZeigeAnlegenModal(true);
  }

  function anlegenModalSchliessen() {
    setZeigeAnlegenModal(false);
    if (neuePerson) auswaehlen(neuePerson.id);
  }

  async function bildQrErzeugen(personId: number): Promise<BildQr> {
    const { token, ablauf_am } = await personBildReservierungAnlegen(personId);
    const url = `${oeffentlicheBasisUrl(config)}/person-bild/${token}`;
    const bildUrl = await QRCode.toDataURL(url, { width: 240, margin: 1 });
    return { personId, token, bildUrl, ablaufAm: ablauf_am };
  }

  async function anlegen(e: FormEvent) {
    e.preventDefault();
    if (!neuerVorname.trim() || !neuerNachname.trim()) return;
    setAnlegenFehler(null);
    try {
      const person = await personAnlegen({
        vorname: neuerVorname.trim(),
        zwischenname: neuerZwischenname.trim() || null,
        nachname: neuerNachname.trim(),
      });
      await laden();
      setNeuePerson(person);
      setBildQr(await bildQrErzeugen(person.id));
    } catch (err) {
      setAnlegenFehler(err instanceof ApiError ? String(err.detail) : "Person konnte nicht angelegt werden.");
    }
  }

  function importModalOeffnen() {
    setImportDatei(null);
    setImportErgebnis(null);
    setImportFehler(null);
    setZeigeImportModal(true);
  }

  async function csvImportieren() {
    if (!importDatei) return;
    setImportLaeuft(true);
    setImportFehler(null);
    setImportErgebnis(null);
    try {
      const ergebnis = await personenCsvImportieren(importDatei);
      setImportErgebnis(ergebnis);
      if (ergebnis.angelegt > 0) await laden();
    } catch (err) {
      setImportFehler(err instanceof ApiError ? String(err.detail) : "Import fehlgeschlagen.");
    } finally {
      setImportLaeuft(false);
    }
  }

  // Solange eines der beiden QR-Foto-Popups offen ist, prüfen ob das Foto
  // bereits vom Handy aus hochgeladen wurde – dabei direkt die Person (Avatar,
  // Timeline) aktualisieren, ohne dass man erst abwählen/auswählen muss.
  useEffect(() => {
    if (!bildQr || bildHochgeladen) return;
    const intervall = setInterval(async () => {
      try {
        const info = await holePersonBildReservierung(bildQr.token);
        if (info.bereits_eingeloest) {
          setBildHochgeladen(true);
          await laden();
          if (ausgewaehlteId === bildQr.personId) await timelineLaden(bildQr.personId);
        }
      } catch {
        // Best effort – wird beim nächsten Intervall erneut versucht.
      }
    }, 1500);
    return () => clearInterval(intervall);
  }, [bildQr, bildHochgeladen, ausgewaehlteId]);

  async function bildQrStandaloneOeffnen(p: Person) {
    setBildQrStandaloneHochgeladen(false);
    setBildQrStandalone(await bildQrErzeugen(p.id));
  }

  function bildQrStandaloneSchliessen() {
    setBildQrStandalone(null);
    setBildQrStandaloneHochgeladen(false);
  }

  useEffect(() => {
    if (!bildQrStandalone || bildQrStandaloneHochgeladen) return;
    const intervall = setInterval(async () => {
      try {
        const info = await holePersonBildReservierung(bildQrStandalone.token);
        if (info.bereits_eingeloest) {
          setBildQrStandaloneHochgeladen(true);
          await laden();
          await timelineLaden(bildQrStandalone.personId);
        }
      } catch {
        // Best effort – wird beim nächsten Intervall erneut versucht.
      }
    }, 1500);
    return () => clearInterval(intervall);
  }, [bildQrStandalone, bildQrStandaloneHochgeladen]);

  async function feldAendern(p: Person, feld: "vorname" | "zwischenname" | "nachname" | "email", wert: string) {
    await personAktualisieren(p.id, { [feld]: wert || null });
    await laden();
    await timelineLaden(p.id);
  }

  async function benachrichtigungenAendern(p: Person, aktiv: boolean) {
    await personAktualisieren(p.id, { benachrichtigungen_aktiv: aktiv });
    await laden();
    await timelineLaden(p.id);
  }

  async function inaktivAendern(p: Person, inaktiv: boolean) {
    await personAktualisieren(p.id, { inaktiv });
    await laden();
    await ladeAmpel();
    await timelineLaden(p.id);
  }

  async function pinSetzen(p: Person) {
    const pin = window.prompt("Neuen PIN für " + p.name + " festlegen (4-6 Ziffern):");
    if (!pin) return;
    if (!/^\d{4,6}$/.test(pin)) {
      alert("Der PIN muss aus 4 bis 6 Ziffern bestehen.");
      return;
    }
    const wiederholung = window.prompt("PIN zur Bestätigung erneut eingeben:");
    if (!wiederholung) return;
    if (wiederholung !== pin) {
      alert("Die beiden Eingaben stimmen nicht überein. Bitte erneut versuchen.");
      return;
    }
    try {
      await personPinSetzen(p.id, pin);
      await laden();
      await timelineLaden(p.id);
    } catch (err) {
      alert(err instanceof ApiError ? String(err.detail) : "PIN konnte nicht gespeichert werden.");
    }
  }

  async function pinEntsperren(p: Person) {
    try {
      await personPinEntsperren(p.id);
      await laden();
      await timelineLaden(p.id);
    } catch (err) {
      alert(err instanceof ApiError ? String(err.detail) : "PIN-Sperre konnte nicht aufgehoben werden.");
    }
  }

  async function gruppeFeldAendern(p: Person, gruppeId: number | null) {
    await personAktualisieren(p.id, { gruppe_id: gruppeId });
    await laden();
    await timelineLaden(p.id);
  }

  async function funktionFeldAendern(p: Person, funktionId: number | null) {
    await personAktualisieren(p.id, { funktion_id: funktionId });
    await laden();
    await timelineLaden(p.id);
  }

  async function bildHochladen(p: Person, datei: File) {
    await personBildHochladen(p.id, datei);
    await laden();
    await timelineLaden(p.id);
  }

  async function barcodeErzeugen(p: Person) {
    const { token, ablauf_am } = await personBarcodeErzeugen(p.id);
    setBarcode({ token, ablaufAm: ablauf_am });
  }

  async function barcodePerMailSenden(p: Person) {
    try {
      await personBarcodePerMailSenden(p.id);
      alert(`Barcode wurde an ${p.email} gesendet.`);
    } catch (err) {
      alert(err instanceof ApiError ? String(err.detail) : "Barcode konnte nicht per Mail gesendet werden.");
    }
  }

  async function loeschen(id: number) {
    const person = liste?.find((p) => p.id === id);
    if (
      !confirm(
        `Person „${person?.name ?? ""}" wirklich unwiderruflich löschen? Alle zugehörigen Eintragungen und Daten werden mit entfernt.`
      )
    )
      return;
    await personLoeschen(id);
    if (ausgewaehlteId === id) {
      setAusgewaehlteId(null);
      setTimeline(null);
    }
    await laden();
  }

  if (fehler) return <Fehlertext>{fehler}</Fehlertext>;
  if (!liste) return <Ladeanzeige />;

  const suchbegriff = suche.trim().toLowerCase();
  const gefiltert = liste.filter((p) => {
    if (suchbegriff && !p.name.toLowerCase().includes(suchbegriff)) return false;
    if (filterKeineMail && p.email) return false;
    if (filterKeinBild && p.bild_url) return false;
    if (filterBenachrichtigung === "an" && !p.benachrichtigungen_aktiv) return false;
    if (filterBenachrichtigung === "aus" && p.benachrichtigungen_aktiv) return false;
    if (filterAbo && !(aboUebersicht[p.id]?.ereignisse.includes(filterAbo))) return false;
    return true;
  });
  const ausgewaehltePerson = liste.find((p) => p.id === ausgewaehlteId) ?? null;

  return (
    <div>
      <div className={`personal-sticky${ausgewaehltePerson ? " personal-sticky--detail" : ""}`}>
        <div className="personal-kopf">
          <h1 style={{ margin: 0 }}>Personal</h1>
          <div className="personal-kopf-buttons">
            <button type="button" className="sekundaer" onClick={() => setZeigeEinstellungen(true)}>
              Personal-Einstellungen
            </button>
            <button type="button" className="sekundaer" onClick={importModalOeffnen}>
              CSV-Import
            </button>
            <button type="button" onClick={anlegenModalOeffnen}>
              + Person hinzufügen
            </button>
          </div>
        </div>
        <input
          className="personal-suche"
          placeholder="Suche…"
          value={suche}
          onChange={(e) => setSuche(e.target.value)}
          autoFocus
        />
      </div>

      {zeigeEinstellungen && (
        <div
          className="modal-overlay modal-overlay--scroll"
          onClick={() => setZeigeEinstellungen(false)}
        >
          <div
            className="karte"
            style={{ width: 640, maxWidth: "95vw" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-zwischen">
              <h2 style={{ margin: 0 }}>Personal-Einstellungen</h2>
              <button type="button" className="sekundaer" onClick={() => setZeigeEinstellungen(false)}>
                Schließen
              </button>
            </div>
            <PersonalEinstellungen />
          </div>
        </div>
      )}

      {zeigeImportModal && (
        <div
          className="modal-overlay modal-overlay--scroll"
          onClick={() => setZeigeImportModal(false)}
        >
          <div
            className="karte"
            style={{ width: 520, maxWidth: "95vw" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-zwischen">
              <h2 style={{ margin: 0 }}>Personen per CSV importieren</h2>
              <button type="button" className="sekundaer" onClick={() => setZeigeImportModal(false)}>
                Schließen
              </button>
            </div>
            <p style={{ marginTop: 12 }}>
              CSV mit den Spalten <code>vorname;zwischenname;nachname;email;gruppe;funktion</code>.
              Gruppe und Funktion werden über den Namen zugeordnet (leer = keine). Fehlerhafte
              Zeilen werden übersprungen und unten aufgelistet.
            </p>
            <button
              type="button"
              className="sekundaer"
              onClick={() => void personenCsvVorlageHerunterladen()}
            >
              Beispiel-CSV herunterladen
            </button>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => {
                  setImportDatei(e.target.files?.[0] ?? null);
                  setImportErgebnis(null);
                  setImportFehler(null);
                }}
              />
              <button
                type="button"
                disabled={!importDatei || importLaeuft}
                onClick={() => void csvImportieren()}
              >
                {importLaeuft ? "Importiere…" : "Import starten"}
              </button>
            </div>
            {importFehler && <Fehlertext>{importFehler}</Fehlertext>}
            {importErgebnis && (
              <div style={{ marginTop: 12 }}>
                <p style={{ fontWeight: 600 }}>
                  {importErgebnis.angelegt} Person(en) angelegt
                  {importErgebnis.fehler.length > 0
                    ? `, ${importErgebnis.fehler.length} Zeile(n) übersprungen`
                    : "."}
                </p>
                {importErgebnis.fehler.length > 0 && (
                  <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
                    {importErgebnis.fehler.map((f) => (
                      <li key={f.zeile} className="fehlertext">
                        Zeile {f.zeile}: {f.fehler}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {zeigeAnlegenModal && (
        <div
          className="modal-overlay"
          onClick={anlegenModalSchliessen}
        >
          <div
            className="karte"
            style={{ width: 360, maxWidth: "90vw", textAlign: "center" }}
            onClick={(e) => e.stopPropagation()}
          >
            {!neuePerson ? (
              <>
                <h2>Person hinzufügen</h2>
                <form onSubmit={anlegen} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <input
                    placeholder="Vorname"
                    value={neuerVorname}
                    onChange={(e) => setNeuerVorname(e.target.value)}
                    autoFocus
                  />
                  <input
                    placeholder="Zwischenname (optional)"
                    value={neuerZwischenname}
                    onChange={(e) => setNeuerZwischenname(e.target.value)}
                  />
                  <input
                    placeholder="Nachname"
                    value={neuerNachname}
                    onChange={(e) => setNeuerNachname(e.target.value)}
                  />
                  {anlegenFehler && <Fehlertext>{anlegenFehler}</Fehlertext>}
                  <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                    <button type="button" className="sekundaer" onClick={anlegenModalSchliessen}>
                      Abbrechen
                    </button>
                    <button type="submit">Anlegen</button>
                  </div>
                </form>
              </>
            ) : !bildQr ? (
              <p>Lege Person an …</p>
            ) : bildHochgeladen ? (
              <>
                <h2>Foto gespeichert!</h2>
                <PersonenAvatar person={liste.find((p) => p.id === neuePerson.id) ?? neuePerson} groesse={120} />
                <p style={{ marginTop: 12 }}>{neuePerson.name} wurde angelegt.</p>
                <button type="button" onClick={anlegenModalSchliessen}>
                  Fertig
                </button>
              </>
            ) : (
              <>
                <h2>{neuePerson.name} angelegt</h2>
                <p className="text-mute">
                  Mit dem Handy scannen, um direkt ein Profilfoto aufzunehmen oder hochzuladen.
                </p>
                <img src={bildQr.bildUrl} alt="QR-Code für Foto-Upload" style={{ width: 220, height: 220 }} />
                <p className="hinweis-klein">
                  Gültig bis {formatiereZeit(bildQr.ablaufAm)}
                </p>
                <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                  <button type="button" className="sekundaer" onClick={anlegenModalSchliessen}>
                    Überspringen
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {bildQrStandalone && ausgewaehltePerson && (
        <div
          className="modal-overlay"
          onClick={bildQrStandaloneSchliessen}
        >
          <div
            className="karte"
            style={{ width: 360, maxWidth: "90vw", textAlign: "center" }}
            onClick={(e) => e.stopPropagation()}
          >
            {bildQrStandaloneHochgeladen ? (
              <>
                <h2>Foto gespeichert!</h2>
                <PersonenAvatar person={liste.find((p) => p.id === ausgewaehltePerson.id) ?? ausgewaehltePerson} groesse={120} />
                <p style={{ marginTop: 12 }}>{ausgewaehltePerson.name}</p>
                <button type="button" onClick={bildQrStandaloneSchliessen}>
                  Fertig
                </button>
              </>
            ) : (
              <>
                <h2>Bild per QR-Code hochladen</h2>
                <p className="text-mute">
                  Mit dem Handy scannen, um ein Profilfoto für <strong>{ausgewaehltePerson.name}</strong>{" "}
                  aufzunehmen oder hochzuladen.
                </p>
                <img src={bildQrStandalone.bildUrl} alt="QR-Code für Foto-Upload" style={{ width: 220, height: 220 }} />
                <p className="hinweis-klein">
                  Gültig bis {formatiereZeit(bildQrStandalone.ablaufAm)}
                </p>
                <button type="button" className="sekundaer" onClick={bildQrStandaloneSchliessen}>
                  Schließen
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <div className={`personal-layout${ausgewaehltePerson ? " personal-layout--detail" : ""}`}>
        <div className="personal-liste">
          <div
            style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12, fontSize: "0.85rem" }}
          >
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input
                type="checkbox"
                checked={filterKeineMail}
                onChange={(e) => setFilterKeineMail(e.target.checked)}
              />
              Keine E-Mail hinterlegt
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input
                type="checkbox"
                checked={filterKeinBild}
                onChange={(e) => setFilterKeinBild(e.target.checked)}
              />
              Kein Profilbild
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              Benachrichtigungen:
              <select
                value={filterBenachrichtigung}
                onChange={(e) => setFilterBenachrichtigung(e.target.value as "alle" | "an" | "aus")}
              >
                <option value="alle">alle</option>
                <option value="an">erlaubt</option>
                <option value="aus">nicht erlaubt</option>
              </select>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              Abonniert Ereignis:
              <select value={filterAbo} onChange={(e) => setFilterAbo(e.target.value)}>
                <option value="">– beliebig –</option>
                {ereignisTypen.map((e) => (
                  <option key={e.key} value={e.key}>
                    {e.label}
                  </option>
                ))}
              </select>
            </label>
            {filterAbo && (
              <span className="text-mute">
                📧 = aktiver Mail-Kanal mit hinterlegter E-Mail
              </span>
            )}
          </div>

          {Object.values(ampelMap).some((s) => s === "gelb" || s === "rot") && (
            <div
              style={{
                display: "flex",
                gap: 14,
                flexWrap: "wrap",
                margin: "0 0 8px 0",
                fontSize: "0.8rem",
                color: "var(--farbe-text-mute)",
              }}
            >
              <span>
                <span style={{ color: "#e0a500" }}>▉</span> länger inaktiv
              </span>
              <span>
                <span style={{ color: "#d64545" }}>▉</span> überfällig
              </span>
            </div>
          )}

          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 16px 0" }}>
            {gefiltert.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => auswaehlen(p.id)}
                  className={p.id === ausgewaehlteId ? "" : "sekundaer"}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 6,
                    textAlign: "left",
                    ...ampelRahmen(ampelMap[p.id]),
                  }}
                  title={ampelTitel(ampelMap[p.id])}
                >
                  <PersonenAvatar person={p} groesse={32} />
                  <span style={{ flex: 1, opacity: ampelMap[p.id] === "inaktiv" ? 0.55 : 1 }}>
                    {p.name}
                  </span>
                  {filterAbo && aboUebersicht[p.id]?.mail_aktiv && (
                    <span title="Aktiver Mail-Kanal mit hinterlegter E-Mail">📧</span>
                  )}
                </button>
              </li>
            ))}
            {gefiltert.length === 0 && <p className="text-mute">Keine Personen gefunden.</p>}
          </ul>
        </div>

        <div className="personal-detail">
          {!ausgewaehltePerson ? (
            <p className="text-mute">Bitte links eine Person auswählen.</p>
          ) : (
            <div className="karte" key={ausgewaehltePerson.id}>
              <button
                type="button"
                className="sekundaer personal-zurueck"
                onClick={() => {
                  setAusgewaehlteId(null);
                  setTimeline(null);
                }}
              >
                ← Zurück zur Liste
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
                <PersonenAvatar person={ausgewaehltePerson} groesse={64} />
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <h2 style={{ margin: 0 }}>{ausgewaehltePerson.name}</h2>
                  {ampelMap[ausgewaehltePerson.id] === "inaktiv" ? (
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--farbe-text-mute)",
                        border: "1px solid var(--farbe-rand)",
                        borderRadius: 999,
                        padding: "1px 8px",
                      }}
                    >
                      inaktiv
                    </span>
                  ) : (
                    (ampelMap[ausgewaehltePerson.id] === "gelb" ||
                      ampelMap[ausgewaehltePerson.id] === "rot") && (
                      <span
                        title={ampelTitel(ampelMap[ausgewaehltePerson.id])}
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: "50%",
                          background: ampelMap[ausgewaehltePerson.id] === "rot" ? "#d64545" : "#e0a500",
                          flexShrink: 0,
                        }}
                      />
                    )
                  )}
                </div>
              </div>

              {(() => {
                // Datengetriebene Tab-Liste: jeder Tab kann über `sichtbar` an eine
                // Modul-/Config-Bedingung gekoppelt werden. So können künftige Module
                // hier eigene Tabs (z. B. Dienststunden) beisteuern, ohne das Layout
                // umzubauen – einfach einen weiteren Eintrag mit `sichtbar` ergänzen.
                const person = ausgewaehltePerson;
                const tabs: { key: string; label: string; sichtbar?: boolean; inhalt: ReactNode }[] = [
                  {
                    key: "stammdaten",
                    label: "Stammdaten",
                    inhalt: (
                      <>
                        <div className="person-felder">
                          <input
                            defaultValue={person.vorname ?? ""}
                            placeholder="Vorname"
                            onBlur={(e) => feldAendern(person, "vorname", e.target.value)}
                          />
                          <input
                            defaultValue={person.zwischenname ?? ""}
                            placeholder="Zwischenname"
                            onBlur={(e) => feldAendern(person, "zwischenname", e.target.value)}
                          />
                          <input
                            defaultValue={person.nachname ?? ""}
                            placeholder="Nachname"
                            onBlur={(e) => feldAendern(person, "nachname", e.target.value)}
                          />
                          <input
                            defaultValue={person.email ?? ""}
                            placeholder="E-Mail"
                            type="email"
                            onBlur={(e) => feldAendern(person, "email", e.target.value)}
                          />
                          <select
                            value={person.gruppe_id ?? ""}
                            onChange={(e) =>
                              gruppeFeldAendern(person, e.target.value ? Number(e.target.value) : null)
                            }
                          >
                            <option value="">– keine Gruppe –</option>
                            {gruppen.map((g) => (
                              <option key={g.id} value={g.id}>
                                {g.name}
                              </option>
                            ))}
                          </select>
                          <select
                            value={person.funktion_id ?? ""}
                            onChange={(e) =>
                              funktionFeldAendern(person, e.target.value ? Number(e.target.value) : null)
                            }
                            title="Default-Funktion für Dienststunden"
                          >
                            <option value="">– keine Funktion –</option>
                            {funktionen.map((f) => (
                              <option key={f.id} value={f.id}>
                                {f.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <label
                          style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}
                          title="Inaktive Personen erhalten keine Aktivitäts-Ampel und keine Ampel-Benachrichtigung. Die automatische Inaktivitäts-Löschung bleibt davon unberührt."
                        >
                          <input
                            type="checkbox"
                            checked={person.inaktiv}
                            onChange={(e) => inaktivAendern(person, e.target.checked)}
                          />
                          Inaktiv (von der Aktivitäts-Ampel ausnehmen)
                        </label>

                        <div className="person-aktionen">
                          <input
                            ref={bildInputRef}
                            type="file"
                            accept="image/png,image/jpeg"
                            style={{ display: "none" }}
                            onChange={(e) => {
                              const datei = e.target.files?.[0];
                              if (datei) bildHochladen(person, datei);
                              e.target.value = "";
                            }}
                          />
                          <button className="sekundaer" onClick={() => bildInputRef.current?.click()}>
                            Bild hochladen
                          </button>
                          <button className="sekundaer" onClick={() => bildQrStandaloneOeffnen(person)}>
                            Bild per QR-Code hochladen
                          </button>
                        </div>

                        <div style={{ marginTop: 24, textAlign: "right" }}>
                          <button
                            className="sekundaer"
                            style={{ color: "#d64545" }}
                            onClick={() => loeschen(person.id)}
                          >
                            Person löschen
                          </button>
                        </div>
                      </>
                    ),
                  },
                  {
                    key: "zugang",
                    label: "Zugang",
                    inhalt: (
                      <>
                        <div className="person-aktionen">
                          <button className="sekundaer" onClick={() => pinSetzen(person)}>
                            PIN setzen
                          </button>
                          <span className="hinweistext">
                            {person.pin_gesetzt ? "🔒 PIN gesetzt" : "Kein PIN gesetzt"}
                          </span>
                        </div>

                        {istPinGesperrt(person) && (
                          <div className="person-aktionen">
                            <button className="sekundaer" onClick={() => pinEntsperren(person)}>
                              PIN-Sperre aufheben
                            </button>
                            <span style={{ fontSize: "0.85rem", color: "var(--farbe-warnung, #b45309)" }}>
                              ⛔ PIN-Login gesperrt (zu viele Fehlversuche)
                            </span>
                          </div>
                        )}

                        {config?.modul_barcode_aktiv ? (
                          <>
                            <div className="person-aktionen">
                              <button className="sekundaer" onClick={() => barcodeErzeugen(person)}>
                                Barcode erzeugen
                              </button>
                              <button
                                className="sekundaer"
                                disabled={!person.email}
                                title={!person.email ? "Erst eine E-Mail-Adresse hinterlegen" : undefined}
                                onClick={() => barcodePerMailSenden(person)}
                              >
                                Barcode per Mail senden
                              </button>
                            </div>
                            {barcode && (
                              <div style={{ textAlign: "center", marginBottom: 16 }}>
                                <div style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: 4 }}>
                                  {person.name}
                                </div>
                                <img src={barcodeBildUrl(barcode.token)} alt="Barcode" style={{ height: 50 }} />
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 4,
                                    marginTop: 4,
                                    justifyContent: "center",
                                  }}
                                >
                                  <input
                                    readOnly
                                    value={barcode.token}
                                    onFocus={(e) => e.target.select()}
                                    style={{ width: 140, fontSize: "0.75rem", fontFamily: "monospace" }}
                                  />
                                  <button
                                    type="button"
                                    className="sekundaer"
                                    style={{ padding: "0.2rem 0.5rem" }}
                                    onClick={(e) => tokenKopieren(barcode.token, e.currentTarget)}
                                  >
                                    Kopieren
                                  </button>
                                </div>
                                {barcode.ablaufAm && (
                                  <div style={{ fontSize: "0.7rem", color: "var(--farbe-text-mute)" }}>
                                    Gültig bis {formatiereDatum(barcode.ablaufAm)}
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        ) : (
                          <p className="hinweistext">
                            Das Barcode-Modul ist deaktiviert – die Anmeldung erfolgt über Name + PIN.
                          </p>
                        )}
                      </>
                    ),
                  },
                  {
                    key: "benachrichtigungen",
                    label: "Benachrichtigungen",
                    inhalt: (
                      <>
                        <label
                          style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}
                          title={
                            !person.email
                              ? "Erst eine E-Mail-Adresse hinterlegen, sonst kommen keine Benachrichtigungen an"
                              : undefined
                          }
                        >
                          <input
                            type="checkbox"
                            checked={person.benachrichtigungen_aktiv}
                            onChange={(e) => benachrichtigungenAendern(person, e.target.checked)}
                          />
                          Benachrichtigungen aktiv
                        </label>
                        <PersonKanaele personId={person.id} personEmail={person.email} />
                      </>
                    ),
                  },
                  {
                    key: "verlauf",
                    label: "Verlauf",
                    inhalt: !timeline ? (
                      <Ladeanzeige />
                    ) : timeline.length === 0 ? (
                      <p className="text-mute">Noch keine Ereignisse.</p>
                    ) : (
                      (() => {
                        const typen = Array.from(new Set(timeline.map((e) => e.typ))).sort();
                        const aktiverFilter = typen.includes(verlaufFilter) ? verlaufFilter : "";
                        const gefiltert = timeline.filter((e) => !aktiverFilter || e.typ === aktiverFilter);
                        return (
                          <>
                            {typen.length > 1 && (
                              <div className="formular-feld" style={{ maxWidth: 260, marginBottom: 8 }}>
                                <label htmlFor="verlauf-filter">Nach Ereignistyp filtern</label>
                                <select
                                  id="verlauf-filter"
                                  value={aktiverFilter}
                                  onChange={(e) => setVerlaufFilter(e.target.value)}
                                >
                                  <option value="">Alle Ereignisse</option>
                                  {typen.map((t) => (
                                    <option key={t} value={t}>
                                      {ereignisLabel(t)}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                            {gefiltert.length === 0 ? (
                              <p className="text-mute">Keine Ereignisse für diesen Filter.</p>
                            ) : (
                              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                                {gefiltert
                                  .slice()
                                  .reverse()
                                  .map((ereignis) => (
                                    <li
                                      key={ereignis.id}
                                      style={{ display: "flex", gap: 8, alignItems: "baseline", padding: "4px 0" }}
                                    >
                                      <span>{PERSON_EREIGNIS_ICON[ereignis.typ] ?? "•"}</span>
                                      <span
                                        style={{ fontSize: "0.8rem", color: "var(--farbe-text-mute)", minWidth: 130 }}
                                      >
                                        {formatiereDatumZeit(ereignis.zeitpunkt)}
                                      </span>
                                      <span>{ereignis.beschreibung}</span>
                                    </li>
                                  ))}
                              </ul>
                            )}
                          </>
                        );
                      })()
                    ),
                  },
                ];
                const sichtbareTabs = tabs.filter((t) => t.sichtbar !== false);
                const aktiverTab = sichtbareTabs.some((t) => t.key === detailTab)
                  ? detailTab
                  : sichtbareTabs[0].key;
                return (
                  <>
                    <div className="person-tabs" role="tablist">
                      {sichtbareTabs.map((t) => (
                        <button
                          key={t.key}
                          type="button"
                          role="tab"
                          aria-selected={t.key === aktiverTab}
                          className={`person-tab${t.key === aktiverTab ? " aktiv" : ""}`}
                          onClick={() => setDetailTab(t.key)}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                    {sichtbareTabs.find((t) => t.key === aktiverTab)?.inhalt}
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
