import { Fehlertext } from "../../components/Fehlertext";
import { useEffect, useState } from "react";
import {
  holeBerechtigungen,
  setzeBerechtigung,
  type BerechtigungMatrix,
  type GruppenfuehrerBerechtigung,
} from "../../api/berechtigungen";
import { ApiError } from "../../api/client";
import { Ladeanzeige } from "../../components/Ladeanzeige";
import { texte } from "../../i18n/texte";

export function Berechtigungen() {
  const t = texte.berechtigungen;
  const [matrix, setMatrix] = useState<BerechtigungMatrix | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [filterModul, setFilterModul] = useState("");

  async function laden() {
    try {
      setMatrix(await holeBerechtigungen());
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : t.ladefehler);
    }
  }

  useEffect(() => {
    laden();
  }, []);

  async function umschalten(mod: GruppenfuehrerBerechtigung, modulKey: string, erlaubt: boolean) {
    try {
      await setzeBerechtigung(mod.id, modulKey, erlaubt);
      setMatrix((m) => {
        if (!m) return m;
        return {
          ...m,
          gruppenfuehrer: m.gruppenfuehrer.map((x) =>
            x.id === mod.id
              ? {
                  ...x,
                  module: erlaubt
                    ? [...x.module, modulKey]
                    : x.module.filter((k) => k !== modulKey),
                }
              : x
          ),
        };
      });
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : t.setzen_fehler);
    }
  }

  if (fehler) return <Fehlertext>{fehler}</Fehlertext>;
  if (!matrix) return <Ladeanzeige />;

  function hatZugriff(mod: GruppenfuehrerBerechtigung, modulKey: string): boolean {
    return mod.ist_admin || mod.module.includes(modulKey);
  }

  const sichtbareGruppenfuehreren = filterModul
    ? matrix.gruppenfuehrer.filter((mod) => hatZugriff(mod, filterModul))
    : matrix.gruppenfuehrer;

  return (
    <div>
      <h1>{t.titel}</h1>
      <p className="text-mute">
{t.intro}
      </p>

      <div className="formular-feld" style={{ maxWidth: 320, marginBottom: 12 }}>
        <label htmlFor="filter-modul">{t.filter_label}</label>
        <select id="filter-modul" value={filterModul} onChange={(e) => setFilterModul(e.target.value)}>
          <option value="">{t.alle_anzeigen}</option>
          {matrix.module.map((m) => (
            <option key={m.key} value={m.key}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      <div className="tabelle-scroll">
        <table>
          <thead>
            <tr>
              <th>{t.th_gruppenfuehrer}</th>
              {matrix.module.map((m) => (
                <th key={m.key}>{m.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sichtbareGruppenfuehreren.map((mod) => (
              <tr key={mod.id}>
                <td>
                  <strong>{mod.username}</strong>
                  {mod.ist_admin && (
                    <span style={{ marginLeft: 6, fontSize: "0.75rem", color: "var(--farbe-text-mute)" }}>
                      {t.admin_vollzugriff}
                    </span>
                  )}
                </td>
                {matrix.module.map((m) => (
                  <td key={m.key} className="text-center">
                    <input
                      type="checkbox"
                      checked={hatZugriff(mod, m.key)}
                      disabled={mod.ist_admin}
                      onChange={(e) => umschalten(mod, m.key, e.target.checked)}
                    />
                  </td>
                ))}
              </tr>
            ))}
            {sichtbareGruppenfuehreren.length === 0 && (
              <tr>
                <td colSpan={matrix.module.length + 1} className="text-mute">
                  {t.keine_treffer}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
