import { useEffect, useState, type FormEvent } from "react";
import { holeAlleGruppen, gruppeAnlegen, gruppeAktualisieren, gruppeLoeschen } from "../../../api/moderator";
import { ApiError } from "../../../api/client";
import type { Gruppe } from "../../../api/types";
import { Ladeanzeige } from "../../../components/Ladeanzeige";

export function GruppenVerwaltung() {
  const [liste, setListe] = useState<Gruppe[] | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [neuerName, setNeuerName] = useState("");

  async function laden() {
    try {
      setListe(await holeAlleGruppen());
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Gruppen konnten nicht geladen werden.");
    }
  }

  useEffect(() => {
    laden();
  }, []);

  async function anlegen(e: FormEvent) {
    e.preventDefault();
    if (!neuerName.trim()) return;
    await gruppeAnlegen({ name: neuerName.trim(), aktiv: true });
    setNeuerName("");
    await laden();
  }

  async function aktivAendern(g: Gruppe, wert: boolean) {
    await gruppeAktualisieren(g.id, { aktiv: wert });
    await laden();
  }

  async function loeschen(id: number) {
    await gruppeLoeschen(id);
    await laden();
  }

  if (fehler) return <p className="fehlertext">{fehler}</p>;
  if (!liste) return <Ladeanzeige />;

  return (
    <div>
      <form onSubmit={anlegen} style={{ marginBottom: 16, display: "flex", gap: 8 }}>
        <input
          placeholder="Neue Gruppe, z. B. 1. Gruppe"
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
          {liste.map((g) => (
            <tr key={g.id}>
              <td>{g.name}</td>
              <td>
                <input type="checkbox" checked={g.aktiv} onChange={(e) => aktivAendern(g, e.target.checked)} />
              </td>
              <td>
                <button className="sekundaer" onClick={() => loeschen(g.id)}>
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
