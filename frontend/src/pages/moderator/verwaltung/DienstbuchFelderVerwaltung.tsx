import { Fehlertext } from "../../../components/Fehlertext";
import { useEffect, useState, type FormEvent } from "react";
import {
  holeAlleDienstbuchFelder,
  dienstbuchFeldAnlegen,
  dienstbuchFeldAktualisieren,
  dienstbuchFeldLoeschen,
} from "../../../api/moderator";
import { ApiError } from "../../../api/client";
import type { DienstbuchFeldDefinition } from "../../../api/types";
import { Ladeanzeige } from "../../../components/Ladeanzeige";

const TYP_LABEL: Record<DienstbuchFeldDefinition["typ"], string> = {
  text: "Text (eine Zeile)",
  mehrzeilig: "Mehrzeilig",
  checkbox: "Checkbox",
  auswahl: "Auswahl (Dropdown)",
};

function optionenAusText(text: string): string[] {
  return text
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

export function DienstbuchFelderVerwaltung() {
  const [liste, setListe] = useState<DienstbuchFeldDefinition[] | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [neuesLabel, setNeuesLabel] = useState("");
  const [neuerTyp, setNeuerTyp] = useState<DienstbuchFeldDefinition["typ"]>("text");
  const [neueOptionen, setNeueOptionen] = useState("");

  async function laden() {
    try {
      setListe(await holeAlleDienstbuchFelder());
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
    await dienstbuchFeldAnlegen({
      label: neuesLabel.trim(),
      typ: neuerTyp,
      optionen: neuerTyp === "auswahl" ? optionenAusText(neueOptionen) : [],
      reihenfolge,
      aktiv: true,
    });
    setNeuesLabel("");
    setNeuerTyp("text");
    setNeueOptionen("");
    await laden();
  }

  async function aktivAendern(f: DienstbuchFeldDefinition, wert: boolean) {
    await dienstbuchFeldAktualisieren(f.id, { aktiv: wert });
    await laden();
  }

  async function reihenfolgeAendern(f: DienstbuchFeldDefinition, wert: number) {
    await dienstbuchFeldAktualisieren(f.id, { reihenfolge: wert });
    await laden();
  }

  async function optionenAendern(f: DienstbuchFeldDefinition, text: string) {
    await dienstbuchFeldAktualisieren(f.id, { optionen: optionenAusText(text) });
    await laden();
  }

  async function loeschen(id: number) {
    await dienstbuchFeldLoeschen(id);
    await laden();
  }

  if (fehler) return <Fehlertext>{fehler}</Fehlertext>;
  if (!liste) return <Ladeanzeige />;

  return (
    <div>
      <p className="hinweistext">
        Frei konfigurierbare Zusatzfelder fürs Dienstbuch (z. B. Ausbildungsthema, Art des Dienstes).
        Werden beim Anlegen eines Dienstbuchs abgefragt und im PDF-Export ausgegeben. Typ „Auswahl"
        zeigt ein Dropdown mit den angegebenen Optionen (Komma-getrennt).
      </p>
      <form onSubmit={anlegen} style={{ marginBottom: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          placeholder="Neues Feld, z. B. Ausbildungsthema"
          value={neuesLabel}
          onChange={(e) => setNeuesLabel(e.target.value)}
        />
        <select
          value={neuerTyp}
          onChange={(e) => setNeuerTyp(e.target.value as DienstbuchFeldDefinition["typ"])}
        >
          {Object.entries(TYP_LABEL).map(([wert, label]) => (
            <option key={wert} value={wert}>
              {label}
            </option>
          ))}
        </select>
        {neuerTyp === "auswahl" && (
          <input
            placeholder="Optionen, Komma-getrennt"
            value={neueOptionen}
            onChange={(e) => setNeueOptionen(e.target.value)}
          />
        )}
        <button type="submit">Anlegen</button>
      </form>
      <div className="tabelle-scroll">
        <table>
          <thead>
            <tr>
              <th>Bezeichnung</th>
              <th>Typ</th>
              <th>Optionen</th>
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
                  {f.typ === "auswahl" ? (
                    <input
                      defaultValue={f.optionen.join(", ")}
                      placeholder="Komma-getrennt"
                      onBlur={(e) => optionenAendern(f, e.target.value)}
                      style={{ width: 180 }}
                    />
                  ) : (
                    <span style={{ color: "var(--farbe-text-mute)" }}>–</span>
                  )}
                </td>
                <td>
                  <input
                    type="number"
                    defaultValue={f.reihenfolge}
                    onBlur={(e) => reihenfolgeAendern(f, Number(e.target.value))}
                    style={{ width: 80 }}
                  />
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={f.aktiv}
                    onChange={(e) => aktivAendern(f, e.target.checked)}
                  />
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
