import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  holeEinsatz,
  holeEinsatzFelder,
  holeEinsatzTimeline,
  einsatzAbschliessen,
  einsatzPdfUrl,
} from "../../api/einsaetze";
import { holeFahrzeuge } from "../../api/stammdaten";
import { ApiError } from "../../api/client";
import type { EinsatzEreignis, EinsatzFeldDefinition, EinsatzOut, Fahrzeug } from "../../api/types";
import "./EinsatzDetailModerator.css";

const EREIGNIS_ICON: Record<string, string> = {
  angelegt: "🚨",
  teilnahme: "✓",
  details: "📝",
  abgeschlossen: "🏁",
  fehlversuch: "⚠️",
};

export function EinsatzDetailModerator() {
  const { id } = useParams<{ id: string }>();
  const [einsatz, setEinsatz] = useState<EinsatzOut | null>(null);
  const [felder, setFelder] = useState<EinsatzFeldDefinition[]>([]);
  const [fahrzeuge, setFahrzeuge] = useState<Fahrzeug[]>([]);
  const [timeline, setTimeline] = useState<EinsatzEreignis[]>([]);
  const [fehler, setFehler] = useState<string | null>(null);
  const [schliesstAb, setSchliesstAb] = useState(false);

  async function laden() {
    if (!id) return;
    try {
      const [e, f, fz, tl] = await Promise.all([
        holeEinsatz(Number(id)),
        holeEinsatzFelder(),
        holeFahrzeuge(),
        holeEinsatzTimeline(Number(id)),
      ]);
      setEinsatz(e);
      setFelder(f);
      setFahrzeuge(fz);
      setTimeline(tl);
      setFehler(null);
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Einsatz konnte nicht geladen werden.");
    }
  }

  useEffect(() => {
    laden();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function abschliessen() {
    if (!einsatz) return;
    if (!confirm(`Einsatz "${einsatz.titel}" als abgeschlossen markieren?`)) return;
    setSchliesstAb(true);
    try {
      await einsatzAbschliessen(einsatz.id);
      await laden();
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Abschließen fehlgeschlagen.");
    } finally {
      setSchliesstAb(false);
    }
  }

  if (fehler) return <p className="fehlertext">{fehler}</p>;
  if (!einsatz) return <p>Lädt …</p>;

  function sitzplatzBezeichnung(fahrzeugId: number | null, sitzplatzId: string | null): string {
    if (fahrzeugId == null || sitzplatzId == null) return "";
    const fahrzeug = fahrzeuge.find((f) => f.id === fahrzeugId);
    const sitz = fahrzeug?.sitzplaetze.find((s) => s.id === sitzplatzId);
    return sitz?.bezeichnung ?? "";
  }

  return (
    <div>
      <p>
        <Link to="/moderator/listen">← Zurück zu den Listen</Link>
      </p>
      <h1>{einsatz.titel}</h1>
      <div className="einsatz-status-zeile">
        <p style={{ color: "#666", margin: 0 }}>
          {new Date(einsatz.zeitpunkt).toLocaleString("de-DE")} · {einsatz.quelle}
        </p>
        <span
          className={`einsatz-status-badge einsatz-status-badge-${einsatz.status}`}
        >
          {einsatz.status}
        </span>
        {einsatz.archiviert && <span className="einsatz-status-badge">archiviert</span>}
      </div>

      <p style={{ marginTop: "1rem", display: "flex", gap: 12, alignItems: "center" }}>
        <a href={einsatzPdfUrl(einsatz.id)} target="_blank" rel="noreferrer">
          Als PDF exportieren
        </a>
        {einsatz.status === "offen" && (
          <button className="sekundaer" onClick={abschliessen} disabled={schliesstAb}>
            {schliesstAb ? "Schließt ab …" : "Einsatz abschließen"}
          </button>
        )}
      </p>

      {felder.length > 0 && (
        <div className="karte">
          <h2>Einsatzdetails</h2>
          <table>
            <tbody>
              {felder.map((f) => {
                const wert = einsatz.zusatzfelder[f.schluessel];
                if (wert === undefined || wert === "" || wert === false) {
                  return (
                    <tr key={f.schluessel}>
                      <td>
                        <strong>{f.label}</strong>
                      </td>
                      <td style={{ color: "#999" }}>–</td>
                    </tr>
                  );
                }
                return (
                  <tr key={f.schluessel}>
                    <td>
                      <strong>{f.label}</strong>
                    </td>
                    <td>{f.typ === "checkbox" ? "Ja" : String(wert)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <h2>Teilnehmer ({einsatz.teilnahmen.length})</h2>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Fahrzeug</th>
            <th>Sitzplatz</th>
            <th>Funktion</th>
            <th>VAB</th>
            <th>Atemschutz (min)</th>
            <th>Nur Gerätehaus</th>
            <th>Auf Anfahrt</th>
            <th>Bemerkung</th>
          </tr>
        </thead>
        <tbody>
          {einsatz.teilnahmen.length === 0 && (
            <tr>
              <td colSpan={9} style={{ color: "#999" }}>
                Keine Teilnehmer eingetragen.
              </td>
            </tr>
          )}
          {einsatz.teilnahmen.map((t) => (
            <tr key={t.id}>
              <td>{t.person_name}</td>
              <td>{t.fahrzeug_name ?? ""}</td>
              <td>{sitzplatzBezeichnung(t.fahrzeug_id, t.sitzplatz_id)}</td>
              <td>{t.funktion_name ?? ""}</td>
              <td>{t.vab ? "Ja" : ""}</td>
              <td>{t.atemschutzminuten || ""}</td>
              <td>{t.nur_geraetehaus ? "Ja" : ""}</td>
              <td>{t.auf_anfahrt ? "Ja" : ""}</td>
              <td>{t.bemerkung ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Timeline</h2>
      {timeline.length === 0 && <p style={{ color: "#999" }}>Noch keine Ereignisse protokolliert.</p>}
      {timeline.length > 0 && (
        <div className="timeline">
          {timeline.map((ereignis) => (
            <div key={ereignis.id} className="timeline-eintrag">
              <div
                className={`timeline-punkt ${
                  ereignis.typ === "abgeschlossen" ? "timeline-punkt-abgeschlossen" : ""
                } ${ereignis.typ === "fehlversuch" ? "timeline-punkt-fehlversuch" : ""}`}
              >
                {EREIGNIS_ICON[ereignis.typ] ?? "•"}
              </div>
              <div className="timeline-zeit">
                {new Date(ereignis.zeitpunkt).toLocaleString("de-DE")}
              </div>
              <div
                className={`timeline-text ${ereignis.typ === "fehlversuch" ? "timeline-text-fehlversuch" : ""}`}
              >
                {ereignis.beschreibung}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
