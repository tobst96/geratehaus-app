import { Fehlertext } from "../../../components/Fehlertext";
import { useEffect, useState, type FormEvent } from "react";
import {
  holeAlleEinsatzFelder,
  einsatzFeldAnlegen,
  einsatzFeldAktualisieren,
  einsatzFeldLoeschen,
} from "../../../api/gruppenfuehrer";
import { ApiError } from "../../../api/client";
import type { EinsatzFeldDefinition } from "../../../api/types";
import { Ladeanzeige } from "../../../components/Ladeanzeige";

const TYP_LABEL: Record<EinsatzFeldDefinition["typ"], string> = {
  text: "Text (eine Zeile)",
  mehrzeilig: "Mehrzeilig",
  checkbox: "Checkbox",
};

export function EinsatzFelderVerwaltung() {
  const [liste, setListe] = useState<EinsatzFeldDefinition[] | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [neuesLabel, setNeuesLabel] = useState("");
  const [neuerTyp, setNeuerTyp] = useState<EinsatzFeldDefinition["typ"]>("text");

  async function laden() {
    try {
      setListe(await holeAlleEinsatzFelder());
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Felder konnten nicht geladen werden.");
    }
  }

  useEffect(() => {
    laden();
  }, []);

  async function anlegen(e: FormEvent) {
    e.preventDefault();
    if (!neuesLabel.trim()) return;
    const reihenfolge = liste ? liste.length : 0;
    await einsatzFeldAnlegen({ label: neuesLabel.trim(), typ: neuerTyp, reihenfolge, aktiv: true });
    setNeuesLabel("");
    setNeuerTyp("text");
    await laden();
  }

  async function aktivAendern(f: EinsatzFeldDefinition, wert: boolean) {
    await einsatzFeldAktualisieren(f.id, { aktiv: wert });
    await laden();
  }

  async function reihenfolgeAendern(f: EinsatzFeldDefinition, wert: number) {
    await einsatzFeldAktualisieren(f.id, { reihenfolge: wert });
    await laden();
  }

  async function loeschen(id: number) {
    await einsatzFeldLoeschen(id);
    await laden();
  }

  if (fehler) return <Fehlertext>{fehler}</Fehlertext>;
  if (!liste) return <Ladeanzeige />;

  return (
    <div>
      <p className="hinweistext">
        Frei konfigurierbare Zusatzfelder für den Einsatzbericht (z. B. Einsatzleiter, Erste Lage,
        Tätigkeit). Werden im Einsatztagebuch unterhalb der Garage angezeigt und im PDF-Export
        ausgegeben.
      </p>
      <form onSubmit={anlegen} style={{ marginBottom: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          placeholder="Neues Feld, z. B. Geschädigter"
          value={neuesLabel}
          onChange={(e) => setNeuesLabel(e.target.value)}
        />
        <select value={neuerTyp} onChange={(e) => setNeuerTyp(e.target.value as EinsatzFeldDefinition["typ"])}>
          {Object.entries(TYP_LABEL).map(([wert, label]) => (
            <option key={wert} value={wert}>
              {label}
            </option>
          ))}
        </select>
        <button type="submit">Anlegen</button>
      </form>
      <div className="tabelle-scroll">
      <table>
        <thead>
          <tr>
            <th>Bezeichnung</th>
            <th>Typ</th>
            <th>Reihenfolge</th>
            <th>Aktiv</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {liste.map((f) => (
            <tr key={f.id}>
              <td>{f.label}</td>
              <td>{TYP_LABEL[f.typ]}</td>
              <td>
                <input
                  type="number"
                  defaultValue={f.reihenfolge}
                  onBlur={(e) => reihenfolgeAendern(f, Number(e.target.value))}
                  style={{ width: 80 }}
                />
              </td>
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
