import { Fehlertext } from "../../components/Fehlertext";
import { useEffect, useState } from "react";
import {
  holeBerechtigungen,
  setzeBerechtigung,
  type BerechtigungMatrix,
  type ModeratorBerechtigung,
} from "../../api/berechtigungen";
import { ApiError } from "../../api/client";
import { Ladeanzeige } from "../../components/Ladeanzeige";

export function Berechtigungen() {
  const [matrix, setMatrix] = useState<BerechtigungMatrix | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [filterModul, setFilterModul] = useState("");

  async function laden() {
    try {
      setMatrix(await holeBerechtigungen());
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Berechtigungen konnten nicht geladen werden.");
    }
  }

  useEffect(() => {
    laden();
  }, []);

  async function umschalten(mod: ModeratorBerechtigung, modulKey: string, erlaubt: boolean) {
    try {
      await setzeBerechtigung(mod.id, modulKey, erlaubt);
      setMatrix((m) => {
        if (!m) return m;
        return {
          ...m,
          moderatoren: m.moderatoren.map((x) =>
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
      setFehler(err instanceof ApiError ? String(err.detail) : "Berechtigung konnte nicht gesetzt werden.");
    }
  }

  if (fehler) return <Fehlertext>{fehler}</Fehlertext>;
  if (!matrix) return <Ladeanzeige />;

  function hatZugriff(mod: ModeratorBerechtigung, modulKey: string): boolean {
    return mod.ist_admin || mod.module.includes(modulKey);
  }

  const sichtbareModeratoren = filterModul
    ? matrix.moderatoren.filter((mod) => hatZugriff(mod, filterModul))
    : matrix.moderatoren;

  return (
    <div>
      <h1>Berechtigungen</h1>
      <p style={{ color: "var(--farbe-text-mute)" }}>
        Zugriff je Moderator und Modul. Admins haben immer Vollzugriff. Hinweis: Die Berechtigungen
        werden bereits gepflegt, greifen aber noch nicht (Aktivierung folgt in einem späteren Schritt).
      </p>

      <div className="formular-feld" style={{ maxWidth: 320, marginBottom: 12 }}>
        <label htmlFor="filter-modul">Nach Zugriff auf Modul filtern</label>
        <select id="filter-modul" value={filterModul} onChange={(e) => setFilterModul(e.target.value)}>
          <option value="">– alle anzeigen –</option>
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
              <th>Moderator</th>
              {matrix.module.map((m) => (
                <th key={m.key}>{m.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sichtbareModeratoren.map((mod) => (
              <tr key={mod.id}>
                <td>
                  <strong>{mod.username}</strong>
                  {mod.ist_admin && (
                    <span style={{ marginLeft: 6, fontSize: "0.75rem", color: "var(--farbe-text-mute)" }}>
                      (Admin – Vollzugriff)
                    </span>
                  )}
                </td>
                {matrix.module.map((m) => (
                  <td key={m.key} style={{ textAlign: "center" }}>
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
            {sichtbareModeratoren.length === 0 && (
              <tr>
                <td colSpan={matrix.module.length + 1} style={{ color: "var(--farbe-text-mute)" }}>
                  Keine Moderatoren mit diesem Zugriff.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
