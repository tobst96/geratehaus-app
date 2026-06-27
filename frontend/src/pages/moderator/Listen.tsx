import { useEffect, useState, type ReactNode } from "react";
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
import { ApiError } from "../../api/client";
import type { BuchungOut, DienstbuchOut, EinsatzOut } from "../../api/types";
import type { DienststundenEintragOut } from "../../api/dienststunden";
import { useAuth } from "../../context/AuthContext";
import { Ladeanzeige } from "../../components/Ladeanzeige";

const TABS_BASIS = ["Einsätze", "Dienstbücher", "Dienststunden", "Buchungen"] as const;
const TAB_NAMENSABWEICHUNGEN = "Namensabweichungen" as const;
type Tab = (typeof TABS_BASIS)[number] | typeof TAB_NAMENSABWEICHUNGEN;

export function Listen() {
  const { moderatorRolle } = useAuth();
  const [searchParams] = useSearchParams();
  const istAdmin = moderatorRolle === "admin";
  const TABS: Tab[] = istAdmin ? [...TABS_BASIS, TAB_NAMENSABWEICHUNGEN] : [...TABS_BASIS];
  const [tab, setTab] = useState<Tab>(() => {
    const urlTab = searchParams.get("tab");
    if (urlTab && ([...TABS_BASIS] as string[]).includes(urlTab)) return urlTab as Tab;
    return "Einsätze";
  });

  return (
    <div>
      <h1>Listen</h1>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <button key={t} className={t === tab ? "" : "sekundaer"} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>
      {tab === "Einsätze" && <EinsaetzeTab />}
      {tab === "Dienstbücher" && <DienstbuecherTab />}
      {tab === "Dienststunden" && <DienststundenTab />}
      {tab === "Buchungen" && <BuchungenTab />}
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
                <td>{new Date(e.zeitpunkt).toLocaleString("de-DE")}</td>
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
                <td>{new Date(d.eroeffnet_am).toLocaleString("de-DE")}</td>
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
                <td>{new Date(b.von).toLocaleString("de-DE")}</td>
                <td>{new Date(b.bis).toLocaleString("de-DE")}</td>
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
            <td>{new Date(d.zeitstempel).toLocaleString("de-DE")}</td>
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
