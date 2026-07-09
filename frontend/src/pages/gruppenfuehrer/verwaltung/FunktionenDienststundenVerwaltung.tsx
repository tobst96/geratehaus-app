import { Fehlertext } from "../../../components/Fehlertext";
import { useEffect, useState, type FormEvent } from "react";
import {
  holeAlleFunktionenDienststunden,
  funktionDienststundenAnlegen,
  funktionDienststundenAktualisieren,
  funktionDienststundenLoeschen,
  ladeFunktionStempelPdf,
} from "../../../api/gruppenfuehrer";
import { ApiError } from "../../../api/client";
import type { FunktionDienststunden } from "../../../api/types";
import { Ladeanzeige } from "../../../components/Ladeanzeige";

export function FunktionenDienststundenVerwaltung() {
  const [liste, setListe] = useState<FunktionDienststunden[] | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [neuerName, setNeuerName] = useState("");
  const [neuerSchwellenwert, setNeuerSchwellenwert] = useState(0);

  async function laden() {
    try {
      setListe(await holeAlleFunktionenDienststunden());
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
    await funktionDienststundenAnlegen({
      name: neuerName.trim(),
      schwellenwert_stunden: neuerSchwellenwert,
      aktiv: true,
    });
    setNeuerName("");
    setNeuerSchwellenwert(0);
    await laden();
  }

  async function aktivAendern(f: FunktionDienststunden, wert: boolean) {
    await funktionDienststundenAktualisieren(f.id, { aktiv: wert });
    await laden();
  }

  async function schwellenwertAendern(f: FunktionDienststunden, wert: number) {
    await funktionDienststundenAktualisieren(f.id, { schwellenwert_stunden: wert });
    await laden();
  }

  async function loeschen(id: number) {
    await funktionDienststundenLoeschen(id);
    await laden();
  }

  if (fehler) return <Fehlertext>{fehler}</Fehlertext>;
  if (!liste) return <Ladeanzeige />;

  return (
    <div>
      <form onSubmit={anlegen} style={{ marginBottom: 16, display: "flex", gap: 8 }}>
        <input
          placeholder="Neue Funktion, z. B. Maschinist"
          value={neuerName}
          onChange={(e) => setNeuerName(e.target.value)}
        />
        <input
          type="number"
          min={0}
          placeholder="Schwellenwert (h)"
          value={neuerSchwellenwert}
          onChange={(e) => setNeuerSchwellenwert(Number(e.target.value))}
          style={{ width: 150 }}
        />
        <button type="submit">Anlegen</button>
      </form>
      <div className="tabelle-scroll">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Schwellenwert (h)</th>
            <th>Aktiv</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {liste.map((f) => (
            <tr key={f.id}>
              <td>{f.name}</td>
              <td>
                <input
                  type="number"
                  min={0}
                  defaultValue={f.schwellenwert_stunden}
                  onBlur={(e) => schwellenwertAendern(f, Number(e.target.value))}
                  style={{ width: 100 }}
                />
              </td>
              <td>
                <input type="checkbox" checked={f.aktiv} onChange={(e) => aktivAendern(f, e.target.checked)} />
              </td>
              <td style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  className="sekundaer"
                  title="QR-Poster zum Aushängen (Scan → Login → Stunden für heute)"
                  onClick={() => ladeFunktionStempelPdf(f.id, f.name)}
                >
                  QR-PDF
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
    </div>
  );
}
