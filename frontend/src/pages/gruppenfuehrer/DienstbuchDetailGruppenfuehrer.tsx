import { Fehlertext } from "../../components/Fehlertext";
import { useEffect, useState } from "react";
import { formatiereDatumZeit } from "../../utils/datum";
import { useParams, Link } from "react-router-dom";
import {
  holeDienstbuch,
  dienstbuchPdfUrl,
  dienstbuchSchliessen,
  dienstbuchWiederOeffnen,
  dienstbuchRelevantSetzen,
} from "../../api/dienstbuecher";
import { ApiError } from "../../api/client";
import type { DienstbuchOut } from "../../api/types";
import { Ladeanzeige } from "../../components/Ladeanzeige";
import { texte } from "../../i18n/texte";

export function DienstbuchDetailGruppenfuehrer() {
  const txt = texte.dienstbuch_detail;
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
      setFehler(err instanceof ApiError ? String(err.detail) : txt.ladefehler);
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
      setFehler(err instanceof ApiError ? String(err.detail) : txt.schliessen_fehler);
    } finally {
      setAendertStatus(false);
    }
  }

  async function wiederOeffnen() {
    if (!dienstbuch) return;
    if (!confirm(`${txt.wieder_oeffnen_confirm_prefix} „${dienstbuch.titel}" ${txt.wieder_oeffnen_confirm_suffix}`)) return;
    setAendertStatus(true);
    try {
      await dienstbuchWiederOeffnen(dienstbuch.id);
      await laden();
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : txt.oeffnen_fehler);
    } finally {
      setAendertStatus(false);
    }
  }

  async function relevantUmschalten() {
    if (!dienstbuch) return;
    setAendertStatus(true);
    try {
      await dienstbuchRelevantSetzen(dienstbuch.id, !dienstbuch.relevant);
      await laden();
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : txt.markierung_fehler);
    } finally {
      setAendertStatus(false);
    }
  }

  if (fehler) return <Fehlertext>{fehler}</Fehlertext>;
  if (!dienstbuch) return <Ladeanzeige />;

  return (
    <div>
      <p>
        <Link to="/gruppenfuehrer/listen">{txt.zurueck}</Link>
      </p>
      <h1>{dienstbuch.titel}</h1>
      <div className="einsatz-status-zeile">
        <p style={{ color: "var(--farbe-text-mute)", margin: 0 }}>
          {formatiereDatumZeit(dienstbuch.eroeffnet_am)}
        </p>
        <span className="einsatz-status-badge">{dienstbuch.geschlossen ? txt.geschlossen : txt.offen}</span>
        {dienstbuch.archiviert && <span className="einsatz-status-badge">{txt.archiviert}</span>}
        {dienstbuch.relevant && <span className="einsatz-status-badge">{txt.relevant_badge}</span>}
      </div>

      <p style={{ marginTop: "1rem", display: "flex", gap: 12, alignItems: "center" }}>
        <a href={dienstbuchPdfUrl(dienstbuch.id)} target="_blank" rel="noreferrer">
          {txt.als_pdf}
        </a>
        {!dienstbuch.geschlossen && (
          <button className="sekundaer" onClick={schliessen} disabled={aendertStatus}>
            {aendertStatus ? txt.schliesst_ab : txt.schliessen}
          </button>
        )}
        {dienstbuch.geschlossen && (
          <button className="sekundaer" onClick={wiederOeffnen} disabled={aendertStatus}>
            {aendertStatus ? txt.oeffnet : txt.wieder_oeffnen}
          </button>
        )}
        <button className="sekundaer" onClick={relevantUmschalten} disabled={aendertStatus}>
          {dienstbuch.relevant ? txt.relevant_entfernen : txt.relevant_markieren}
        </button>
      </p>

      {dienstbuch.notizen && (
        <div className="karte">
          <h2>{txt.notizen}</h2>
          <p>{dienstbuch.notizen}</p>
        </div>
      )}

      <h2>{txt.teilnehmer} ({dienstbuch.teilnehmer.length})</h2>
      <div className="tabelle-scroll">
      <table>
        <thead>
          <tr>
            <th>{txt.th_name}</th>
            <th>{txt.th_gruppe}</th>
            <th>{txt.th_atemschutz}</th>
            <th>{txt.th_ohne_pin}</th>
          </tr>
        </thead>
        <tbody>
          {dienstbuch.teilnehmer.length === 0 && (
            <tr>
              <td colSpan={4} className="text-mute">
                {txt.keine_teilnehmer}
              </td>
            </tr>
          )}
          {dienstbuch.teilnehmer.map((t) => (
            <tr key={t.id} className={t.ohne_pin ? "zeile-hervorgehoben" : undefined}>
              <td>{t.person_name}</td>
              <td>{t.gruppe_name ?? ""}</td>
              <td>{t.atemschutzminuten || ""}</td>
              <td>{t.ohne_pin ? "Ja" : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
