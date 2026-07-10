import { Fehlertext } from "../../components/Fehlertext";
import { useEffect, useMemo, useState } from "react";
import { formatiereDatumZeit } from "../../utils/datum";
import { exportiereAuditLog, holeAuditLog, type AuditEintrag } from "../../api/audit";
import { ApiError } from "../../api/client";
import { Ladeanzeige } from "../../components/Ladeanzeige";
import { texte } from "../../i18n/texte";

function aktionLabel(aktion: string): string {
  return texte.audit_log.aktionen[aktion] ?? aktion;
}

export function AuditLog() {
  const t = texte.audit_log;
  const [eintraege, setEintraege] = useState<AuditEintrag[] | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [filterAktion, setFilterAktion] = useState("");

  async function laden() {
    try {
      setFehler(null);
      setEintraege(await holeAuditLog(undefined, 500));
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : t.ladefehler);
    }
  }

  useEffect(() => {
    laden();
  }, []);

  const aktionen = useMemo(
    () => Array.from(new Set((eintraege ?? []).map((e) => e.aktion))).sort(),
    [eintraege]
  );

  if (fehler) return <Fehlertext>{fehler}</Fehlertext>;
  if (!eintraege) return <Ladeanzeige />;

  const sichtbar = filterAktion ? eintraege.filter((e) => e.aktion === filterAktion) : eintraege;

  return (
    <div>
      <h1>{t.titel}</h1>
      <p className="text-mute">
{t.intro}
      </p>

      <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 12 }}>
        <div className="formular-feld" style={{ maxWidth: 320, marginBottom: 0 }}>
          <label htmlFor="filter-aktion">{t.filter_label}</label>
          <select id="filter-aktion" value={filterAktion} onChange={(e) => setFilterAktion(e.target.value)}>
            <option value="">{t.alle_anzeigen}</option>
            {aktionen.map((a) => (
              <option key={a} value={a}>
                {aktionLabel(a)}
              </option>
            ))}
          </select>
        </div>
        <button type="button" className="sekundaer" onClick={laden}>
          {t.neu_laden}
        </button>
        <button
          type="button"
          className="sekundaer"
          onClick={() => exportiereAuditLog("csv", filterAktion || undefined)}
        >
          {t.export_csv}
        </button>
        <button
          type="button"
          className="sekundaer"
          onClick={() => exportiereAuditLog("json", filterAktion || undefined)}
        >
          {t.export_json}
        </button>
      </div>

      <div className="tabelle-scroll">
        <table>
          <thead>
            <tr>
              <th>{t.th_zeitpunkt}</th>
              <th>{t.th_akteur}</th>
              <th>{t.th_aktion}</th>
              <th>{t.th_objekt}</th>
              <th>{t.th_details}</th>
            </tr>
          </thead>
          <tbody>
            {sichtbar.map((e) => (
              <tr key={e.id}>
                <td className="nowrap">
                  {formatiereDatumZeit(e.zeitpunkt)}
                </td>
                <td>{e.akteur}</td>
                <td>{aktionLabel(e.aktion)}</td>
                <td className="text-mute">
                  {e.objekt_typ}
                  {e.objekt_id != null ? ` #${e.objekt_id}` : ""}
                </td>
                <td>{e.details}</td>
              </tr>
            ))}
            {sichtbar.length === 0 && (
              <tr>
                <td colSpan={5} className="text-mute">
                  {t.keine_eintraege}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
