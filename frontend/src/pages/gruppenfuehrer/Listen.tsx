import { Fehlertext } from "../../components/Fehlertext";
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
} from "../../api/gruppenfuehrer";
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
import { texte } from "../../i18n/texte";

const t = texte.listen;

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

// Berechtigungs-Key je Tab: Gruppenführer sehen einen Bereichs-Tab nur mit dem
// Modul-Recht (Admins via Bypass). Formulare hat keins – der Server filtert die
// Einreichungen über `gruppenfuehrer_sichtbar`.
const TAB_PERM: Partial<Record<(typeof TABS_BASIS)[number], string>> = {
  "Einsätze": "einsatztagebuch",
  "Dienstbücher": "dienstbuch",
  "Dienststunden": "dienststunden",
  "Buchungen": "fahrzeugbuchung",
};

export function Listen() {
  const { gruppenfuehrerRolle, hatModulZugriff } = useAuth();
  const { config } = useConfig();
  const [searchParams] = useSearchParams();
  const istAdmin = gruppenfuehrerRolle === "admin";

  const configWerte = config as Record<string, unknown> | null;
  const sichtbareBasis = TABS_BASIS.filter(
    (t) =>
      configWerte?.[TAB_MODUL[t]] !== false &&
      (!TAB_PERM[t] || hatModulZugriff(TAB_PERM[t] as string))
  );
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
      setFehler(err instanceof ApiError ? String(err.detail) : t.fehler_liste);
    }
  }

  useEffect(() => {
    laden();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <FilterZeile>
        <DatumFeld label={t.von} value={von} onChange={setVon} />
        <DatumFeld label={t.bis} value={bis} onChange={setBis} />
        <ArchiviertFeld value={archiviert} onChange={setArchiviert} />
        <button onClick={laden}>{t.filtern}</button>
      </FilterZeile>
      {fehler && <Fehlertext>{fehler}</Fehlertext>}
      {daten && (
        <div className="tabelle-scroll">
        <table>
          <thead>
            <tr>
              <th>{t.th_titel}</th>
              <th>{t.th_zeitpunkt}</th>
              <th>{t.th_quelle}</th>
              <th>{t.th_status}</th>
              <th>{t.th_teilnehmer}</th>
              <th>{t.th_archiviert}</th>
            </tr>
          </thead>
          <tbody>
            {daten.map((e) => (
              <tr key={e.id}>
                <td>
                  <Link to={`/gruppenfuehrer/einsaetze/${e.id}`}>{e.titel}</Link>
                </td>
                <td>{formatiereDatumZeit(e.zeitpunkt)}</td>
                <td>{e.quelle}</td>
                <td>{e.status}</td>
                <td>{e.teilnahmen.length}</td>
                <td>{e.archiviert ? t.ja : ""}</td>
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
      setFehler(err instanceof ApiError ? String(err.detail) : t.fehler_liste);
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
        <DatumFeld label={t.von} value={von} onChange={setVon} />
        <DatumFeld label={t.bis} value={bis} onChange={setBis} />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">{t.status_alle}</option>
          <option value="offen">{t.status_offen}</option>
          <option value="geschlossen">{t.status_geschlossen}</option>
        </select>
        <ArchiviertFeld value={archiviert} onChange={setArchiviert} />
        <button onClick={laden}>{t.filtern}</button>
      </FilterZeile>
      {fehler && <Fehlertext>{fehler}</Fehlertext>}
      {daten && (
        <div className="tabelle-scroll">
        <table>
          <thead>
            <tr>
              <th>{t.th_titel}</th>
              <th>{t.th_eroeffnet}</th>
              <th>{t.th_status}</th>
              <th>{t.th_teilnehmer}</th>
              <th>{t.th_archiviert}</th>
            </tr>
          </thead>
          <tbody>
            {gefiltert.map((d) => (
              <tr key={d.id}>
                <td>
                  <Link to={`/gruppenfuehrer/dienstbuecher/${d.id}`}>{d.titel}</Link>
                </td>
                <td>{formatiereDatumZeit(d.eroeffnet_am)}</td>
                <td>{d.geschlossen ? t.geschlossen : t.offen}</td>
                <td>{d.teilnehmer.length}</td>
                <td>{d.archiviert ? t.ja : ""}</td>
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
      setFehler(err instanceof ApiError ? String(err.detail) : t.fehler_liste);
    }
  }

  useEffect(() => {
    laden();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <SchwellenwertUeberschreitungenTab />

      <h2 style={{ marginTop: "2rem" }}>{t.alle_eintraege}</h2>
      <FilterZeile>
        <DatumFeld label={t.von} value={von} onChange={setVon} />
        <DatumFeld label={t.bis} value={bis} onChange={setBis} />
        <button onClick={laden}>{t.filtern}</button>
      </FilterZeile>
      {fehler && <Fehlertext>{fehler}</Fehlertext>}
      {daten && (
        <div className="tabelle-scroll">
        <table>
          <thead>
            <tr>
              <th>{t.th_person}</th>
              <th>{t.th_funktion}</th>
              <th>{t.th_stunden}</th>
              <th>{t.th_datum}</th>
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
      setFehler(err instanceof ApiError ? String(err.detail) : t.fehler_liste);
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
      setFehler(err instanceof ApiError ? String(err.detail) : t.fehler_uebernahme);
    } finally {
      setSpeichertSchluessel(null);
    }
  }

  return (
    <div style={{ marginTop: "2rem" }}>
      <h2>{t.schwellenwert_titel}</h2>
      <p className="text-mute">{t.schwellenwert_hinweis}</p>
      {fehler && <Fehlertext>{fehler}</Fehlertext>}
      {daten && daten.length === 0 && <p className="text-mute">{t.keine_ueberschreitungen}</p>}
      {daten && daten.length > 0 && (
        <div className="tabelle-scroll">
        <table>
          <thead>
            <tr>
              <th>{t.th_person}</th>
              <th>{t.th_funktion}</th>
              <th>{t.th_summe}</th>
              <th>{t.th_schwellenwert}</th>
              <th>{t.th_uebernommen}</th>
              <th>{t.th_ueberschuss}</th>
              <th>{t.th_stunden_uebernehmen}</th>
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
                    {speichertSchluessel === schluessel(e) ? t.speichert : t.uebernehmen}
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
      setFehler(err instanceof ApiError ? String(err.detail) : t.fehler_liste);
    }
  }

  useEffect(() => {
    laden();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <FilterZeile>
        <DatumFeld label={t.von} value={von} onChange={setVon} />
        <DatumFeld label={t.bis} value={bis} onChange={setBis} />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">{t.status_alle}</option>
          <option value="ausstehend">{t.buchung_status_ausstehend}</option>
          <option value="genehmigt">{t.buchung_status_genehmigt}</option>
          <option value="abgelehnt">{t.buchung_status_abgelehnt}</option>
          <option value="zurueckgezogen">{t.buchung_status_zurueckgezogen}</option>
        </select>
        <button onClick={laden}>{t.filtern}</button>
      </FilterZeile>
      {fehler && <Fehlertext>{fehler}</Fehlertext>}
      {daten && (
        <div className="tabelle-scroll">
        <table>
          <thead>
            <tr>
              <th>{t.th_fahrzeug}</th>
              <th>{t.von}</th>
              <th>{t.bis}</th>
              <th>{t.th_zweck}</th>
              <th>{t.th_verantwortlich}</th>
              <th>{t.th_status}</th>
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
      .catch((err) => setFehler(err instanceof ApiError ? String(err.detail) : t.fehler_liste));
  }, []);

  if (fehler) return <Fehlertext>{fehler}</Fehlertext>;
  if (!daten) return <Ladeanzeige />;

  return (
    <div className="tabelle-scroll">
    <table>
      <thead>
        <tr>
          <th>{t.th_cookie_name}</th>
          <th>{t.th_eingetragener_name}</th>
          <th>{t.th_zeitstempel}</th>
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
      <option value="">{t.archiviert_alle}</option>
      <option value="false">{t.archiviert_aktive}</option>
      <option value="true">{t.archiviert_archivierte}</option>
    </select>
  );
}

function formularWertText(a: Einreichung["antworten"][number]): string {
  if (a.typ === "checkbox") return a.wert ? t.ja : t.nein;
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
        setFehler(err instanceof ApiError ? String(err.detail) : t.fehler_formulare)
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
      setFehler(err instanceof ApiError ? String(err.detail) : t.fehler_daten);
    }
  }

  if (fehler) return <Fehlertext>{fehler}</Fehlertext>;
  if (!formulare) return <Ladeanzeige />;
  if (formulare.length === 0)
    return <p className="text-mute">{t.keine_formulare}</p>;

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
            {t.auswertung}
          </button>
          <button
            className={ansicht === "einreichungen" ? "" : "sekundaer"}
            onClick={() => setAnsicht("einreichungen")}
          >
            {t.einreichungen}
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
          <p className="text-mute">{t.keine_einreichungen}</p>
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
