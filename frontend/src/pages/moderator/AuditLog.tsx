import { useEffect, useMemo, useState } from "react";
import { exportiereAuditLog, holeAuditLog, type AuditEintrag } from "../../api/audit";
import { ApiError } from "../../api/client";
import { Ladeanzeige } from "../../components/Ladeanzeige";

// Menschlesbare Bezeichnungen für die maschinellen Aktions-Schlüssel. Unbekannte
// Schlüssel werden unverändert angezeigt (robust gegen neu hinzukommende Hooks).
const AKTION_LABEL: Record<string, string> = {
  person_geloescht: "Person gelöscht",
  einsatz_geloescht: "Einsatz gelöscht",
  buchung_genehmigt: "Buchung genehmigt",
  buchung_abgelehnt: "Buchung abgelehnt",
  berechtigung_geaendert: "Berechtigung geändert",
  moderator_angelegt: "Moderator angelegt",
  moderator_passwort_geaendert: "Moderator-Passwort geändert",
  moderator_geloescht: "Moderator gelöscht",
  modul_flag_geaendert: "Modul-Einstellung geändert",
};

function aktionLabel(aktion: string): string {
  return AKTION_LABEL[aktion] ?? aktion;
}

export function AuditLog() {
  const [eintraege, setEintraege] = useState<AuditEintrag[] | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [filterAktion, setFilterAktion] = useState("");

  async function laden() {
    try {
      setFehler(null);
      setEintraege(await holeAuditLog(undefined, 500));
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Audit-Log konnte nicht geladen werden.");
    }
  }

  useEffect(() => {
    laden();
  }, []);

  const aktionen = useMemo(
    () => Array.from(new Set((eintraege ?? []).map((e) => e.aktion))).sort(),
    [eintraege]
  );

  if (fehler) return <p className="fehlertext">{fehler}</p>;
  if (!eintraege) return <Ladeanzeige />;

  const sichtbar = filterAktion ? eintraege.filter((e) => e.aktion === filterAktion) : eintraege;

  return (
    <div>
      <h1>Audit-Log</h1>
      <p style={{ color: "var(--farbe-text-mute)" }}>
        Sicherheitsrelevante Aktionen (Löschungen, Freigaben, Rechte- und Zugangsänderungen),
        neueste zuerst. Nur für Admins sichtbar. Einträge älter als die konfigurierte
        Aufbewahrungsfrist werden automatisch gelöscht.
      </p>

      <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 12 }}>
        <div className="formular-feld" style={{ maxWidth: 320, marginBottom: 0 }}>
          <label htmlFor="filter-aktion">Nach Aktion filtern</label>
          <select id="filter-aktion" value={filterAktion} onChange={(e) => setFilterAktion(e.target.value)}>
            <option value="">– alle anzeigen –</option>
            {aktionen.map((a) => (
              <option key={a} value={a}>
                {aktionLabel(a)}
              </option>
            ))}
          </select>
        </div>
        <button type="button" className="sekundaer" onClick={laden}>
          Neu laden
        </button>
        <button
          type="button"
          className="sekundaer"
          onClick={() => exportiereAuditLog("csv", filterAktion || undefined)}
        >
          Export CSV
        </button>
        <button
          type="button"
          className="sekundaer"
          onClick={() => exportiereAuditLog("json", filterAktion || undefined)}
        >
          Export JSON
        </button>
      </div>

      <div className="tabelle-scroll">
        <table>
          <thead>
            <tr>
              <th>Zeitpunkt</th>
              <th>Akteur</th>
              <th>Aktion</th>
              <th>Objekt</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {sichtbar.map((e) => (
              <tr key={e.id}>
                <td style={{ whiteSpace: "nowrap" }}>
                  {new Date(e.zeitpunkt).toLocaleString("de-DE")}
                </td>
                <td>{e.akteur}</td>
                <td>{aktionLabel(e.aktion)}</td>
                <td style={{ color: "var(--farbe-text-mute)" }}>
                  {e.objekt_typ}
                  {e.objekt_id != null ? ` #${e.objekt_id}` : ""}
                </td>
                <td>{e.details}</td>
              </tr>
            ))}
            {sichtbar.length === 0 && (
              <tr>
                <td colSpan={5} style={{ color: "var(--farbe-text-mute)" }}>
                  Keine Einträge.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
