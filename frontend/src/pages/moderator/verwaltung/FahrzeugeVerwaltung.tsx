import { useEffect, useState, type FormEvent } from "react";
import {
  holeAlleFahrzeuge,
  fahrzeugAnlegen,
  fahrzeugAktualisieren,
  fahrzeugLoeschen,
  holeAlleFunktionenEinsatz,
} from "../../../api/moderator";
import { ApiError } from "../../../api/client";
import type { Fahrzeug, FunktionEinsatz } from "../../../api/types";
import { SitzplatzEditor } from "../SitzplatzEditor";
import { Ladeanzeige } from "../../../components/Ladeanzeige";

export function FahrzeugeVerwaltung() {
  const [liste, setListe] = useState<Fahrzeug[] | null>(null);
  const [funktionen, setFunktionen] = useState<FunktionEinsatz[]>([]);
  const [fehler, setFehler] = useState<string | null>(null);
  const [neuerName, setNeuerName] = useState("");
  const [editorFahrzeug, setEditorFahrzeug] = useState<Fahrzeug | null>(null);

  async function laden() {
    try {
      setListe(await holeAlleFahrzeuge());
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Fahrzeuge konnten nicht geladen werden.");
    }
  }

  useEffect(() => {
    laden();
    holeAlleFunktionenEinsatz().then(setFunktionen).catch(() => setFunktionen([]));
  }, []);

  async function anlegen(e: FormEvent) {
    e.preventDefault();
    if (!neuerName.trim()) return;
    await fahrzeugAnlegen({ name: neuerName.trim(), aktiv: true, buchbar: true });
    setNeuerName("");
    await laden();
  }

  async function feldAendern(f: Fahrzeug, feld: "aktiv" | "buchbar", wert: boolean) {
    await fahrzeugAktualisieren(f.id, { [feld]: wert });
    await laden();
  }

  async function loeschen(id: number) {
    await fahrzeugLoeschen(id);
    await laden();
  }

  if (fehler) return <p className="fehlertext">{fehler}</p>;
  if (!liste) return <Ladeanzeige />;

  return (
    <div>
      <form onSubmit={anlegen} style={{ marginBottom: 16, display: "flex", gap: 8 }}>
        <input
          placeholder="Neues Fahrzeug, z. B. HLF 20"
          value={neuerName}
          onChange={(e) => setNeuerName(e.target.value)}
        />
        <button type="submit">Anlegen</button>
      </form>
      <div className="tabelle-scroll">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Aktiv</th>
            <th>Buchbar</th>
            <th>ISSI</th>
            <th>Sitzplätze</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {liste.map((f) => (
            <tr key={f.id}>
              <td>{f.name}</td>
              <td>
                <input type="checkbox" checked={f.aktiv} onChange={(e) => feldAendern(f, "aktiv", e.target.checked)} />
              </td>
              <td>
                <input
                  type="checkbox"
                  checked={f.buchbar}
                  onChange={(e) => feldAendern(f, "buchbar", e.target.checked)}
                />
              </td>
              <td>
                <input
                  type="number"
                  defaultValue={f.issi ?? ""}
                  placeholder="–"
                  style={{ width: 90 }}
                  onBlur={(e) => {
                    const val = e.target.value.trim();
                    const neu = val === "" ? null : parseInt(val, 10);
                    if (neu !== f.issi) fahrzeugAktualisieren(f.id, { issi: neu }).then(laden);
                  }}
                />
              </td>
              <td>{f.sitzplaetze.length}</td>
              <td style={{ display: "flex", gap: 8 }}>
                <button className="sekundaer" onClick={() => setEditorFahrzeug(f)}>
                  Sitzplätze bearbeiten
                </button>
                <button className="sekundaer" onClick={() => loeschen(f.id)}>
                  Löschen
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      {editorFahrzeug && (
        <SitzplatzEditor
          fahrzeug={editorFahrzeug}
          funktionen={funktionen}
          onClose={() => setEditorFahrzeug(null)}
          onGespeichert={async () => {
            setEditorFahrzeug(null);
            await laden();
          }}
        />
      )}
    </div>
  );
}
