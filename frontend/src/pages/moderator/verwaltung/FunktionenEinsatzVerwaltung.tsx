import { Fehlertext } from "../../../components/Fehlertext";
import { useEffect, useState, type FormEvent } from "react";
import {
  holeAlleFunktionenEinsatz,
  funktionEinsatzAnlegen,
  funktionEinsatzAktualisieren,
  funktionEinsatzLoeschen,
} from "../../../api/moderator";
import { ApiError } from "../../../api/client";
import type { FunktionEinsatz } from "../../../api/types";
import { Ladeanzeige } from "../../../components/Ladeanzeige";

export function FunktionenEinsatzVerwaltung() {
  const [liste, setListe] = useState<FunktionEinsatz[] | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [neuerName, setNeuerName] = useState("");

  async function laden() {
    try {
      setListe(await holeAlleFunktionenEinsatz());
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Funktionen konnten nicht geladen werden.");
    }
  }

  useEffect(() => {
    laden();
  }, []);

  async function anlegen(e: FormEvent) {
    e.preventDefault();
    if (!neuerName.trim()) return;
    await funktionEinsatzAnlegen({ name: neuerName.trim(), aktiv: true });
    setNeuerName("");
    await laden();
  }

  async function aktivAendern(f: FunktionEinsatz, wert: boolean) {
    await funktionEinsatzAktualisieren(f.id, { aktiv: wert });
    await laden();
  }

  async function loeschen(id: number) {
    await funktionEinsatzLoeschen(id);
    await laden();
  }

  if (fehler) return <Fehlertext>{fehler}</Fehlertext>;
  if (!liste) return <Ladeanzeige />;

  return (
    <div>
      <form onSubmit={anlegen} style={{ marginBottom: 16, display: "flex", gap: 8 }}>
        <input
          placeholder="Neue Funktion, z. B. Gruppenführer"
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
            <th></th>
          </tr>
        </thead>
        <tbody>
          {liste.map((f) => (
            <tr key={f.id}>
              <td>{f.name}</td>
              <td>
                <input type="checkbox" checked={f.aktiv} onChange={(e) => aktivAendern(f, e.target.checked)} />
              </td>
              <td>
                <button className="sekundaer" onClick={() => loeschen(f.id)}>
                  Löschen
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
