import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  holeEinsaetzeListe,
  holeDienstbuecherListe,
  holeDienststundenListe,
  holeBuchungenListe,
  holeNamensabweichungen,
  type NamensAbweichungOut,
} from "../../api/moderator";
import { dienstbuchPdfUrl, dienstbuchSchliessen, dienstbuchWiederOeffnen } from "../../api/dienstbuecher";
import { ApiError } from "../../api/client";
import type { BuchungOut, DienstbuchOut, EinsatzOut } from "../../api/types";
import type { DienststundenEintragOut } from "../../api/dienststunden";

const TABS = ["Einsätze", "Dienstbücher", "Dienststunden", "Buchungen", "Namensabweichungen"] as const;
type Tab = (typeof TABS)[number];

export function Listen() {
  const [tab, setTab] = useState<Tab>("Einsätze");

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
      {tab === "Namensabweichungen" && <NamensabweichungenTab />}
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

  async function schliessen(id: number) {
    try {
      await dienstbuchSchliessen(id);
      await laden();
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Schließen fehlgeschlagen.");
    }
  }

  async function wiederOeffnen(id: number) {
    try {
      await dienstbuchWiederOeffnen(id);
      await laden();
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Wieder öffnen fehlgeschlagen.");
    }
  }

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
        <table>
          <thead>
            <tr>
              <th>Titel</th>
              <th>Eröffnet am</th>
              <th>Status</th>
              <th>Teilnehmer</th>
              <th>Archiviert</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {gefiltert.map((d) => (
              <tr key={d.id}>
                <td>{d.titel}</td>
                <td>{new Date(d.eroeffnet_am).toLocaleString("de-DE")}</td>
                <td>{d.geschlossen ? "Geschlossen" : "Offen"}</td>
                <td>{d.teilnehmer.length}</td>
                <td>{d.archiviert ? "Ja" : ""}</td>
                <td style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <a href={dienstbuchPdfUrl(d.id)} target="_blank" rel="noreferrer">
                    PDF
                  </a>
                  {d.geschlossen ? (
                    <button className="sekundaer" onClick={() => wiederOeffnen(d.id)}>
                      Wieder öffnen
                    </button>
                  ) : (
                    <button className="sekundaer" onClick={() => schliessen(d.id)}>
                      Schließen
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
      <FilterZeile>
        <DatumFeld label="Von" value={von} onChange={setVon} />
        <DatumFeld label="Bis" value={bis} onChange={setBis} />
        <button onClick={laden}>Filtern</button>
      </FilterZeile>
      {fehler && <p className="fehlertext">{fehler}</p>}
      {daten && (
        <table>
          <thead>
            <tr>
              <th>Person-ID</th>
              <th>Funktion-ID</th>
              <th>Stunden</th>
              <th>Datum</th>
            </tr>
          </thead>
          <tbody>
            {daten.map((d) => (
              <tr key={d.id}>
                <td>{d.person_id}</td>
                <td>{d.funktion_id}</td>
                <td>{d.stunden}</td>
                <td>{d.datum}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
  if (!daten) return <p>Lädt …</p>;

  return (
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
