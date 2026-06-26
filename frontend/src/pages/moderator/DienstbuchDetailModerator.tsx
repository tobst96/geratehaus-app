import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  holeDienstbuch,
  dienstbuchPdfUrl,
  dienstbuchSchliessen,
  dienstbuchWiederOeffnen,
} from "../../api/dienstbuecher";
import { ApiError } from "../../api/client";
import type { DienstbuchOut } from "../../api/types";

export function DienstbuchDetailModerator() {
  const { id } = useParams<{ id: string }>();
  const [dienstbuch, setDienstbuch] = useState<DienstbuchOut | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [aendertStatus, setAendertStatus] = useState(false);

  async function laden() {
    if (!id) return;
    try {
      setDienstbuch(await holeDienstbuch(Number(id)));
      setFehler(null);
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Dienstbuch konnte nicht geladen werden.");
    }
  }

  useEffect(() => {
    laden();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function schliessen() {
    if (!dienstbuch) return;
    setAendertStatus(true);
    try {
      await dienstbuchSchliessen(dienstbuch.id);
      await laden();
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Schließen fehlgeschlagen.");
    } finally {
      setAendertStatus(false);
    }
  }

  async function wiederOeffnen() {
    if (!dienstbuch) return;
    if (!confirm(`Dienstbuch "${dienstbuch.titel}" wieder öffnen?`)) return;
    setAendertStatus(true);
    try {
      await dienstbuchWiederOeffnen(dienstbuch.id);
      await laden();
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Wieder öffnen fehlgeschlagen.");
    } finally {
      setAendertStatus(false);
    }
  }

  if (fehler) return <p className="fehlertext">{fehler}</p>;
  if (!dienstbuch) return <p>Lädt …</p>;

  return (
    <div>
      <p>
        <Link to="/moderator/listen">← Zurück zu den Listen</Link>
      </p>
      <h1>{dienstbuch.titel}</h1>
      <div className="einsatz-status-zeile">
        <p style={{ color: "#666", margin: 0 }}>
          {new Date(dienstbuch.eroeffnet_am).toLocaleString("de-DE")}
        </p>
        <span className="einsatz-status-badge">{dienstbuch.geschlossen ? "geschlossen" : "offen"}</span>
        {dienstbuch.archiviert && <span className="einsatz-status-badge">archiviert</span>}
      </div>

      <p style={{ marginTop: "1rem", display: "flex", gap: 12, alignItems: "center" }}>
        <a href={dienstbuchPdfUrl(dienstbuch.id)} target="_blank" rel="noreferrer">
          Als PDF exportieren
        </a>
        {!dienstbuch.geschlossen && (
          <button className="sekundaer" onClick={schliessen} disabled={aendertStatus}>
            {aendertStatus ? "Schließt ab …" : "Dienstbuch schließen"}
          </button>
        )}
        {dienstbuch.geschlossen && (
          <button className="sekundaer" onClick={wiederOeffnen} disabled={aendertStatus}>
            {aendertStatus ? "Öffnet …" : "Dienstbuch wieder öffnen"}
          </button>
        )}
      </p>

      {dienstbuch.notizen && (
        <div className="karte">
          <h2>Notizen</h2>
          <p>{dienstbuch.notizen}</p>
        </div>
      )}

      <h2>Teilnehmer ({dienstbuch.teilnehmer.length})</h2>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Gruppe</th>
            <th>Atemschutz (min)</th>
          </tr>
        </thead>
        <tbody>
          {dienstbuch.teilnehmer.length === 0 && (
            <tr>
              <td colSpan={3} style={{ color: "#999" }}>
                Keine Teilnehmer eingetragen.
              </td>
            </tr>
          )}
          {dienstbuch.teilnehmer.map((t) => (
            <tr key={t.id}>
              <td>{t.person_name}</td>
              <td>{t.gruppe_name ?? ""}</td>
              <td>{t.atemschutzminuten || ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
