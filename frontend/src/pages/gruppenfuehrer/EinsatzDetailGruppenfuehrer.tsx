import { Fehlertext } from "../../components/Fehlertext";
import { useEffect, useState } from "react";
import { formatiereDatumZeit } from "../../utils/datum";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  holeEinsatz,
  holeEinsatzFelder,
  holeEinsatzTimeline,
  einsatzAbschliessen,
  einsatzWiederOeffnen,
  einsatzLoeschen,
  einsatzPdfUrl,
} from "../../api/einsaetze";
import { holeFahrzeuge } from "../../api/stammdaten";
import { ApiError } from "../../api/client";
import type { EinsatzEreignis, EinsatzFeldDefinition, EinsatzOut, Fahrzeug } from "../../api/types";
import "./EinsatzDetailGruppenfuehrer.css";
import { Ladeanzeige } from "../../components/Ladeanzeige";
import { texte } from "../../i18n/texte";

const t = texte.einsatz_detail;

const EREIGNIS_ICON: Record<string, string> = {
  angelegt: "🚨",
  teilnahme: "✓",
  details: "📝",
  abgeschlossen: "🏁",
  fehlversuch: "⚠️",
  email: "📧",
  email_fehler: "⚠️",
  wiedereroeffnet: "🔓",
};

export function EinsatzDetailGruppenfuehrer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
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
      setFehler(err instanceof ApiError ? String(err.detail) : t.fehler_laden);
    }
  }

  useEffect(() => {
    laden();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function abschliessen() {
    if (!einsatz) return;
    setSchliesstAb(true);
    try {
      await einsatzAbschliessen(einsatz.id);
      await laden();
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : t.fehler_abschliessen);
    } finally {
      setSchliesstAb(false);
    }
  }

  async function wiederOeffnen() {
    if (!einsatz) return;
    if (!confirm(`${t.frage_prefix}${einsatz.titel}${t.wieder_oeffnen_frage_suffix}`)) return;
    setSchliesstAb(true);
    try {
      await einsatzWiederOeffnen(einsatz.id);
      await laden();
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : t.fehler_oeffnen);
    } finally {
      setSchliesstAb(false);
    }
  }

  async function loeschen() {
    if (!einsatz) return;
    if (
      !confirm(`${t.frage_prefix}${einsatz.titel}${t.loeschen_frage_suffix}`)
    )
      return;
    setSchliesstAb(true);
    try {
      await einsatzLoeschen(einsatz.id);
      navigate("/gruppenfuehrer/listen?tab=Eins%C3%A4tze");
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : t.fehler_loeschen);
      setSchliesstAb(false);
    }
  }

  if (fehler) return <Fehlertext>{fehler}</Fehlertext>;
  if (!einsatz) return <Ladeanzeige />;

  function sitzplatzBezeichnung(fahrzeugId: number | null, sitzplatzId: string | null): string {
    if (fahrzeugId == null || sitzplatzId == null) return "";
    const fahrzeug = fahrzeuge.find((f) => f.id === fahrzeugId);
    const sitz = fahrzeug?.sitzplaetze.find((s) => s.id === sitzplatzId);
    return sitz?.bezeichnung ?? "";
  }

  return (
    <div>
      <p>
        <Link to="/gruppenfuehrer/listen">{t.zurueck}</Link>
      </p>
      <h1>{einsatz.titel}</h1>
      <div className="einsatz-status-zeile">
        <p style={{ color: "var(--farbe-text-mute)", margin: 0 }}>
          {formatiereDatumZeit(einsatz.zeitpunkt)} · {einsatz.quelle}
        </p>
        <span
          className={`einsatz-status-badge einsatz-status-badge-${einsatz.status}`}
        >
          {einsatz.status}
        </span>
        {einsatz.archiviert && <span className="einsatz-status-badge">{t.badge_archiviert}</span>}
      </div>

      {(einsatz.adresse || einsatz.meldung || einsatz.einsatznummer) && (
        <div className="karte" style={{ marginTop: "1rem" }}>
          {einsatz.einsatznummer && (
            <p style={{ margin: "0 0 0.25rem" }}>
              <strong>{t.einsatznummer}</strong> {einsatz.einsatznummer}
            </p>
          )}
          {einsatz.adresse && (
            <p style={{ margin: "0 0 0.25rem" }}>
              <strong>{t.adresse}</strong> {einsatz.adresse}
            </p>
          )}
          {einsatz.meldung && (
            <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>
              <strong>{t.meldung}</strong> {einsatz.meldung}
            </p>
          )}
        </div>
      )}

      <div className="einsatz-aktionen">
        <a
          className="einsatz-aktion sekundaer"
          href={einsatzPdfUrl(einsatz.id)}
          target="_blank"
          rel="noreferrer"
        >
          {t.pdf_export}
        </a>
        {einsatz.status === "offen" && (
          <button className="einsatz-aktion sekundaer" onClick={abschliessen} disabled={schliesstAb}>
            {schliesstAb ? t.schliesst_ab : t.abschliessen}
          </button>
        )}
        {einsatz.status === "abgeschlossen" && (
          <button className="einsatz-aktion sekundaer" onClick={wiederOeffnen} disabled={schliesstAb}>
            {schliesstAb ? t.oeffnet : t.wieder_oeffnen}
          </button>
        )}
        <button
          className="einsatz-aktion sekundaer gefahr"
          onClick={loeschen}
          disabled={schliesstAb}
        >
          {t.loeschen}
        </button>
      </div>

      {felder.length > 0 && (
        <div className="karte">
          <h2>{t.einsatzdetails}</h2>
          <div className="tabelle-scroll">
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
                      <td className="text-mute">–</td>
                    </tr>
                  );
                }
                return (
                  <tr key={f.schluessel}>
                    <td>
                      <strong>{f.label}</strong>
                    </td>
                    <td>{f.typ === "checkbox" ? t.ja : String(wert)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}

      <h2>{t.teilnehmer} ({einsatz.teilnahmen.length})</h2>
      <div className="tabelle-scroll">
      <table>
        <thead>
          <tr>
            <th>{t.th_name}</th>
            <th>{t.th_fahrzeug}</th>
            <th>{t.th_sitzplatz}</th>
            <th>{t.th_funktion}</th>
            <th>{t.th_vab}</th>
            <th>{t.th_atemschutz}</th>
            <th>{t.th_nur_geraetehaus}</th>
            <th>{t.th_auf_anfahrt}</th>
            <th>{t.th_ohne_barcode}</th>
            <th>{t.th_ip_browser}</th>
            <th>{t.th_bemerkung}</th>
          </tr>
        </thead>
        <tbody>
          {einsatz.teilnahmen.length === 0 && (
            <tr>
              <td colSpan={11} className="text-mute">
                {t.keine_teilnehmer}
              </td>
            </tr>
          )}
          {einsatz.teilnahmen.map((teilnahme) => (
            <tr key={teilnahme.id}>
              <td>{teilnahme.person_name}</td>
              <td>{teilnahme.fahrzeug_name ?? ""}</td>
              <td>{sitzplatzBezeichnung(teilnahme.fahrzeug_id, teilnahme.sitzplatz_id)}</td>
              <td>{teilnahme.funktion_name ?? ""}</td>
              <td>{teilnahme.vab ? t.ja : ""}</td>
              <td>{teilnahme.atemschutzminuten || ""}</td>
              <td>{teilnahme.nur_geraetehaus ? t.ja : ""}</td>
              <td>{teilnahme.auf_anfahrt ? t.ja : ""}</td>
              <td>{teilnahme.ohne_barcode ? t.ja : ""}</td>
              <td title={teilnahme.eintragung_user_agent ?? ""} className="hinweis-klein">
                {teilnahme.eintragung_ip ?? ""}
              </td>
              <td>{teilnahme.bemerkung ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      <h2>{t.timeline}</h2>
      {timeline.length === 0 && <p className="text-mute">{t.keine_ereignisse}</p>}
      {timeline.length > 0 && (
        <div className="timeline">
          {timeline.map((ereignis) => (
            <div key={ereignis.id} className="timeline-eintrag">
              <div
                className={`timeline-punkt ${
                  ereignis.typ === "abgeschlossen" ? "timeline-punkt-abgeschlossen" : ""
                } ${
                  ereignis.typ === "fehlversuch" || ereignis.typ === "email_fehler"
                    ? "timeline-punkt-fehlversuch"
                    : ""
                }`}
              >
                {EREIGNIS_ICON[ereignis.typ] ?? "•"}
              </div>
              <div className="timeline-zeit">
                {formatiereDatumZeit(ereignis.zeitpunkt)}
              </div>
              <div
                className={`timeline-text ${
                  ereignis.typ === "fehlversuch" || ereignis.typ === "email_fehler"
                    ? "timeline-text-fehlversuch"
                    : ""
                }`}
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
