import { useEffect, useState, type ReactNode } from "react";
import { formatiereDatumZeit } from "../../utils/datum";
import { Link, useSearchParams } from "react-router-dom";
import {
  holeEinsaetzeListe,
  holeDienstbuecherListe,
  holeDienststundenListe,
  holeBuchungenListe,
  holeNamensabweichungen,
  holeDienststundenSchwellenwert,
  dienststundenUebernahmeEintragen,
  type NamensAbweichungOut,
  type SchwellenwertEintrag,
} from "../../api/moderator";
import {
  holeSichtbareFormulare,
  holeEinreichungen,
  holeZusammenfassung,
  type Einreichung,
  type Formular,
  type Zusammenfassung,
} from "../../api/formular";
import { FormularZusammenfassung } from "./FormularZusammenfassung";
import { ApiError } from "../../api/client";
import type { BuchungOut, DienstbuchOut, EinsatzOut } from "../../api/types";
import type { DienststundenEintragOut } from "../../api/dienststunden";
import { useAuth } from "../../context/AuthContext";
import { useConfig } from "../../context/ConfigContext";
import { Ladeanzeige } from "../../components/Ladeanzeige";

const TABS_BASIS = ["Einsätze", "Dienstbücher", "Dienststunden", "Buchungen", "Formulare"] as const;
const TAB_NAMENSABWEICHUNGEN = "Namensabweichungen" as const;
type Tab = (typeof TABS_BASIS)[number] | typeof TAB_NAMENSABWEICHUNGEN;

// Zuordnung Listen-Tab -> Modul-Config-Key. Ist das Modul deaktiviert, wird der
// Tab (und Nav-Unterpunkt) ausgeblendet.
const TAB_MODUL: Record<(typeof TABS_BASIS)[number], string> = {
  "Einsätze": "modul_einsatztagebuch_aktiv",
  "Dienstbücher": "modul_dienstbuch_aktiv",
  "Dienststunden": "modul_dienststunden_aktiv",
  "Buchungen": "modul_fahrzeugbuchung_aktiv",
  "Formulare": "modul_formular_aktiv",
};

export function Listen() {
  const { moderatorRolle } = useAuth();
  const { config } = useConfig();
  const [searchParams] = useSearchParams();
  const istAdmin = moderatorRolle === "admin";

  const configWerte = config as Record<string, unknown> | null;
  const sichtbareBasis = TABS_BASIS.filter((t) => configWerte?.[TAB_MODUL[t]] !== false);
  const TABS: Tab[] = istAdmin ? [...sichtbareBasis, TAB_NAMENSABWEICHUNGEN] : [...sichtbareBasis];

  const [tab, setTab] = useState<Tab>(TABS[0] ?? "Einsätze");

  // Tab aus der URL übernehmen (Nav-Unterpunkte verlinken mit ?tab=…) und auf
  // sichtbare Tabs beschränken; ist der aktuelle Tab (nicht mehr) verfügbar,
  // auf den ersten sichtbaren zurückfallen.
  useEffect(() => {
    const urlTab = searchParams.get("tab");
    if (urlTab && (TABS as string[]).includes(urlTab)) {
      setTab(urlTab as Tab);
    } else if (!(TABS as string[]).includes(tab)) {
      setTab(TABS[0] ?? "Einsätze");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, config]);

  return (
    <div>
      <h1>{tab}</h1>
      {tab === "Einsätze" && <EinsaetzeTab />}
      {tab === "Dienstbücher" && <DienstbuecherTab />}
      {tab === "Dienststunden" && <DienststundenTab />}
      {tab === "Buchungen" && <BuchungenTab />}
      {tab === "Formulare" && <FormulareTab />}
      {tab === "Namensabweichungen" && istAdmin && <NamensabweichungenTab />}
    </div>
  );
}

function EinsaetzeTab() {
  const [von, setVon] = useState("");
  const [bis, setBis] = useState("");
  const [archiviert, setArchiviert] = useState("");
  const [daten, setDaten] = useState<EinsatzOut[] | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);

  const filter = {
    von: von || undefined,
    bis: bis || undefined,
    archiviert: archiviert === "" ? undefined : archiviert === "true",
  };

  async function laden() {
    try {
      setDaten(await holeEinsaetzeListe(filter));
      setFehler(null);
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Liste konnte nicht geladen werden.");
    }
  }

  useEffect(() => {
    laden();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <FilterZeile>
        <DatumFeld label="Von" value={von} onChange={setVon} />
        <DatumFeld label="Bis" value={bis} onChange={setBis} />
        <ArchiviertFeld value={archiviert} onChange={setArchiviert} />
        <button onClick={laden}>Filtern</button>
      </FilterZeile>
      {fehler && <p className="fehlertext">{fehler}</p>}
      {daten && (
        <div className="tabelle-scroll">
        <table>
          <thead>
            <tr>
              <th>Titel</th>
              <th>Zeitpunkt</th>
              <th>Quelle</th>
              <th>Status</th>
              <th>Teilnehmer</th>
              <th>Archiviert</th>
            </tr>
          </thead>
          <tbody>
            {daten.map((e) => (
              <tr key={e.id}>
                <td>
                  <Link to={`/moderator/einsaetze/${e.id}`}>{e.titel}</Link>
                </td>
                <td>{formatiereDatumZeit(e.zeitpunkt)}</td>
                <td>{e.quelle}</td>
                <td>{e.status}</td>
                <td>{e.teilnahmen.length}</td>
                <td>{e.archiviert ? "Ja" : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}

function DienstbuecherTab() {
  const [von, setVon] = useState("");
  const [bis, setBis] = useState("");
  const [archiviert, setArchiviert] = useState("");
  const [status, setStatus] = useState("");
  const [daten, setDaten] = useState<DienstbuchOut[] | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);

  const filter = {
    von: von || undefined,
    bis: bis || undefined,
    archiviert: archiviert === "" ? undefined : archiviert === "true",
  };

  async function laden() {
    try {
      setDaten(await holeDienstbuecherListe(filter));
      setFehler(null);
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Liste konnte nicht geladen werden.");
    }
  }

  useEffect(() => {
    laden();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const gefiltert = (daten ?? []).filter((d) => {
    if (status === "offen") return !d.geschlossen;
    if (status === "geschlossen") return d.geschlossen;
    return true;
  });

  return (
    <div>
      <FilterZeile>
        <DatumFeld label="Von" value={von} onChange={setVon} />
        <DatumFeld label="Bis" value={bis} onChange={setBis} />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Alle Status</option>
          <option value="offen">Nur offene</option>
          <option value="geschlossen">Nur geschlossene</option>
        </select>
        <ArchiviertFeld value={archiviert} onChange={setArchiviert} />
        <button onClick={laden}>Filtern</button>
      </FilterZeile>
      {fehler && <p className="fehlertext">{fehler}</p>}
      {daten && (
        <div className="tabelle-scroll">
        <table>
          <thead>
            <tr>
              <th>Titel</th>
              <th>Eröffnet am</th>
              <th>Status</th>
              <th>Teilnehmer</th>
              <th>Archiviert</th>
            </tr>
          </thead>
          <tbody>
            {gefiltert.map((d) => (
              <tr key={d.id}>
                <td>
                  <Link to={`/moderator/dienstbuecher/${d.id}`}>{d.titel}</Link>
                </td>
                <td>{formatiereDatumZeit(d.eroeffnet_am)}</td>
                <td>{d.geschlossen ? "Geschlossen" : "Offen"}</td>
                <td>{d.teilnehmer.length}</td>
                <td>{d.archiviert ? "Ja" : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}

function DienststundenTab() {
  const [von, setVon] = useState("");
  const [bis, setBis] = useState("");
  const [daten, setDaten] = useState<DienststundenEintragOut[] | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);

  const filter = { von: von || undefined, bis: bis || undefined };

  async function laden() {
    try {
      setDaten(await holeDienststundenListe(filter));
      setFehler(null);
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Liste konnte nicht geladen werden.");
    }
  }

  useEffect(() => {
    laden();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <SchwellenwertUeberschreitungenTab />

      <h2 style={{ marginTop: "2rem" }}>Alle Einträge</h2>
      <FilterZeile>
        <DatumFeld label="Von" value={von} onChange={setVon} />
        <DatumFeld label="Bis" value={bis} onChange={setBis} />
        <button onClick={laden}>Filtern</button>
      </FilterZeile>
      {fehler && <p className="fehlertext">{fehler}</p>}
      {daten && (
        <div className="tabelle-scroll">
        <table>
          <thead>
            <tr>
              <th>Person</th>
              <th>Funktion</th>
              <th>Stunden</th>
              <th>Datum</th>
            </tr>
          </thead>
          <tbody>
            {daten.map((d) => (
              <tr key={d.id}>
                <td>{d.person_name}</td>
                <td>{d.funktion_name}</td>
                <td>{d.stunden}</td>
                <td>{d.datum}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}

function SchwellenwertUeberschreitungenTab() {
  const [daten, setDaten] = useState<SchwellenwertEintrag[] | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [eingabe, setEingabe] = useState<Record<string, string>>({});
  const [speichertSchluessel, setSpeichertSchluessel] = useState<string | null>(null);

  async function laden() {
    try {
      setDaten(await holeDienststundenSchwellenwert());
      setFehler(null);
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Liste konnte nicht geladen werden.");
    }
  }

  useEffect(() => {
    laden();
  }, []);

  function schluessel(e: SchwellenwertEintrag): string {
    return `${e.person_id}-${e.funktion_id}`;
  }

  async function uebernehmen(e: SchwellenwertEintrag) {
    const wert = Number(eingabe[schluessel(e)] ?? "");
    if (!wert || wert <= 0) return;
    setSpeichertSchluessel(schluessel(e));
    try {
      await dienststundenUebernahmeEintragen(e.person_id, e.funktion_id, wert);
      setEingabe((vorher) => ({ ...vorher, [schluessel(e)]: "" }));
      await laden();
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Übernahme konnte nicht gespeichert werden.");
    } finally {
      setSpeichertSchluessel(null);
    }
  }

  return (
    <div style={{ marginTop: "2rem" }}>
      <h2>Schwellenwert-Überschreitungen</h2>
      <p style={{ color: "var(--farbe-text-mute)" }}>
        Personen, die den Schwellenwert ihrer Funktion auch nach Abzug bereits übernommener Stunden
        noch überschreiten. Übernommene Stunden werden vom Überschuss abgezogen, ohne die
        Dienststunden-Einträge selbst zu verändern.
      </p>
      {fehler && <p className="fehlertext">{fehler}</p>}
      {daten && daten.length === 0 && <p style={{ color: "var(--farbe-text-mute)" }}>Aktuell keine Überschreitungen.</p>}
      {daten && daten.length > 0 && (
        <div className="tabelle-scroll">
        <table>
          <thead>
            <tr>
              <th>Person</th>
              <th>Funktion</th>
              <th>Summe</th>
              <th>Schwellenwert</th>
              <th>Bereits übernommen</th>
              <th>Überschuss</th>
              <th>Stunden übernehmen</th>
            </tr>
          </thead>
          <tbody>
            {daten.map((e) => (
              <tr key={schluessel(e)}>
                <td>{e.person_name}</td>
                <td>{e.funktion_name}</td>
                <td>{e.summe_stunden}</td>
                <td>{e.schwellenwert_stunden}</td>
                <td>{e.uebernommen_stunden}</td>
                <td>
                  <strong>{e.ueberschuss_stunden}</strong>
                </td>
                <td style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="number"
                    min={0.5}
                    step={0.5}
                    style={{ width: 80 }}
                    value={eingabe[schluessel(e)] ?? ""}
                    onChange={(ev) =>
                      setEingabe((vorher) => ({ ...vorher, [schluessel(e)]: ev.target.value }))
                    }
                  />
                  <button
                    className="sekundaer"
                    onClick={() => uebernehmen(e)}
                    disabled={speichertSchluessel === schluessel(e)}
                  >
                    {speichertSchluessel === schluessel(e) ? "Speichert …" : "Übernehmen"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}

function BuchungenTab() {
  const [von, setVon] = useState("");
  const [bis, setBis] = useState("");
  const [status, setStatus] = useState("");
  const [daten, setDaten] = useState<BuchungOut[] | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);

  const filter = { von: von || undefined, bis: bis || undefined, status: status || undefined };

  async function laden() {
    try {
      setDaten(await holeBuchungenListe(filter));
      setFehler(null);
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Liste konnte nicht geladen werden.");
    }
  }

  useEffect(() => {
    laden();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <FilterZeile>
        <DatumFeld label="Von" value={von} onChange={setVon} />
        <DatumFeld label="Bis" value={bis} onChange={setBis} />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Alle Status</option>
          <option value="ausstehend">Ausstehend</option>
          <option value="genehmigt">Genehmigt</option>
          <option value="abgelehnt">Abgelehnt</option>
          <option value="zurueckgezogen">Zurückgezogen</option>
        </select>
        <button onClick={laden}>Filtern</button>
      </FilterZeile>
      {fehler && <p className="fehlertext">{fehler}</p>}
      {daten && (
        <div className="tabelle-scroll">
        <table>
          <thead>
            <tr>
              <th>Fahrzeug</th>
              <th>Von</th>
              <th>Bis</th>
              <th>Zweck</th>
              <th>Verantwortlich</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {daten.map((b) => (
              <tr key={b.id}>
                <td>{b.fahrzeug_name}</td>
                <td>{formatiereDatumZeit(b.von)}</td>
                <td>{formatiereDatumZeit(b.bis)}</td>
                <td>{b.zweck}</td>
                <td>{b.verantwortliche_person_name}</td>
                <td>{b.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}

function NamensabweichungenTab() {
  const [daten, setDaten] = useState<NamensAbweichungOut[] | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);

  useEffect(() => {
    holeNamensabweichungen()
      .then(setDaten)
      .catch((err) => setFehler(err instanceof ApiError ? String(err.detail) : "Liste konnte nicht geladen werden."));
  }, []);

  if (fehler) return <p className="fehlertext">{fehler}</p>;
  if (!daten) return <Ladeanzeige />;

  return (
    <div className="tabelle-scroll">
    <table>
      <thead>
        <tr>
          <th>Bisheriger Name (Cookie)</th>
          <th>Neu eingetragener Name</th>
          <th>Zeitstempel</th>
        </tr>
      </thead>
      <tbody>
        {daten.map((d) => (
          <tr key={d.id}>
            <td>{d.cookie_name}</td>
            <td>{d.eingetragener_name}</td>
            <td>{formatiereDatumZeit(d.zeitstempel)}</td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}

function FilterZeile({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
      {children}
    </div>
  );
}

function DatumFeld({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
      {label}
      <input type="date" value={value} onChange={(e) => onChange(e.target.value)} style={{ width: 150 }} />
    </label>
  );
}

function ArchiviertFeld({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Alle</option>
      <option value="false">Nur aktive</option>
      <option value="true">Nur archivierte</option>
    </select>
  );
}

function formularWertText(a: Einreichung["antworten"][number]): string {
  if (a.typ === "checkbox") return a.wert ? "Ja" : "Nein";
  if (Array.isArray(a.wert)) return a.wert.join(", ");
  if (a.wert === null || a.wert === "") return "–";
  return String(a.wert);
}

function FormulareTab() {
  const [formulare, setFormulare] = useState<Formular[] | null>(null);
  const [ausgewaehltId, setAusgewaehltId] = useState<number | null>(null);
  const [ansicht, setAnsicht] = useState<"auswertung" | "einreichungen">("auswertung");
  const [einreichungen, setEinreichungen] = useState<Einreichung[] | null>(null);
  const [zusammenfassung, setZusammenfassung] = useState<Zusammenfassung | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);

  useEffect(() => {
    holeSichtbareFormulare()
      .then(setFormulare)
      .catch((err) =>
        setFehler(err instanceof ApiError ? String(err.detail) : "Formulare konnten nicht geladen werden.")
      );
  }, []);

  async function auswaehlen(id: number) {
    setAusgewaehltId(id);
    setEinreichungen(null);
    setZusammenfassung(null);
    try {
      const [z, e] = await Promise.all([holeZusammenfassung(id), holeEinreichungen(id)]);
      setZusammenfassung(z);
      setEinreichungen(e);
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Daten konnten nicht geladen werden.");
    }
  }

  if (fehler) return <p className="fehlertext">{fehler}</p>;
  if (!formulare) return <Ladeanzeige />;
  if (formulare.length === 0)
    return <p style={{ color: "var(--farbe-text-mute)" }}>Keine für dich freigegebenen Formulare.</p>;

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        {formulare.map((f) => (
          <button
            key={f.id}
            className={f.id === ausgewaehltId ? "" : "sekundaer"}
            onClick={() => auswaehlen(f.id)}
          >
            {f.name}
          </button>
        ))}
      </div>

      {ausgewaehltId !== null && (
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button
            className={ansicht === "auswertung" ? "" : "sekundaer"}
            onClick={() => setAnsicht("auswertung")}
          >
            Auswertung
          </button>
          <button
            className={ansicht === "einreichungen" ? "" : "sekundaer"}
            onClick={() => setAnsicht("einreichungen")}
          >
            Einreichungen
          </button>
        </div>
      )}

      {ausgewaehltId !== null && ansicht === "auswertung" && zusammenfassung && (
        <FormularZusammenfassung daten={zusammenfassung} />
      )}

      {ausgewaehltId !== null &&
        ansicht === "einreichungen" &&
        (!einreichungen ? (
          <Ladeanzeige />
        ) : einreichungen.length === 0 ? (
          <p style={{ color: "var(--farbe-text-mute)" }}>Noch keine Einreichungen.</p>
        ) : (
          einreichungen.map((e) => (
            <div
              key={e.id}
              style={{ border: "1px solid var(--farbe-rand)", borderRadius: 8, padding: 12, marginBottom: 8 }}
            >
              <div style={{ fontSize: "0.85rem", color: "var(--farbe-text-mute)", marginBottom: 6 }}>
                {formatiereDatumZeit(e.erstellt_am)}
                {e.person_name ? ` · ${e.person_name}` : ""}
              </div>
              {e.antworten.map((a) => (
                <div key={a.feld_id}>
                  <strong>{a.label}:</strong> {formularWertText(a)}
                </div>
              ))}
            </div>
          ))
        ))}
    </div>
  );
}
