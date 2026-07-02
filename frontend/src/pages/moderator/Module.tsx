import { useEffect, useState } from "react";
import { holeModule, setModulAktiv, type Modul } from "../../api/module";
import { ApiError } from "../../api/client";
import { Ladeanzeige } from "../../components/Ladeanzeige";

export function Module() {
  const [module, setModule] = useState<Modul[] | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);

  async function laden() {
    try {
      setModule(await holeModule());
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Module konnten nicht geladen werden.");
    }
  }

  useEffect(() => {
    laden();
  }, []);

  async function umschalten(modul: Modul) {
    try {
      const aktualisiert = await setModulAktiv(modul.key, !modul.aktiv);
      setModule((liste) =>
        liste ? liste.map((m) => (m.key === aktualisiert.key ? aktualisiert : m)) : liste
      );
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Modul konnte nicht geändert werden.");
    }
  }

  if (fehler) return <p className="fehlertext">{fehler}</p>;
  if (!module) return <Ladeanzeige />;

  return (
    <div>
      <h1>Module</h1>
      <p style={{ color: "var(--farbe-text-mute)" }}>
        Übersicht aller Anwendungsbereiche. Die Feinsteuerung der Zugriffe pro Moderator folgt
        in einem späteren Schritt.
      </p>
      <div className="tabelle-scroll">
        <table>
          <thead>
            <tr>
              <th>Modul</th>
              <th>Beschreibung</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {module.map((m) => (
              <tr key={m.key}>
                <td>
                  <strong>{m.name}</strong>
                </td>
                <td style={{ color: "var(--farbe-text-mute)" }}>{m.beschreibung}</td>
                <td>
                  <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input type="checkbox" checked={m.aktiv} onChange={() => umschalten(m)} />
                    {m.aktiv ? "aktiv" : "inaktiv"}
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
