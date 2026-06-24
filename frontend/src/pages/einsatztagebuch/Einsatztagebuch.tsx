import { useEffect, useState } from "react";
import { holeEinsaetze } from "../../api/einsaetze";
import { holeFahrzeuge, holeFunktionenEinsatz } from "../../api/stammdaten";
import { ApiError } from "../../api/client";
import { EinsatzDiagramm } from "./EinsatzDiagramm";
import type { EinsatzOut, Fahrzeug, FunktionEinsatz } from "../../api/types";

export function Einsatztagebuch() {
  const [einsaetze, setEinsaetze] = useState<EinsatzOut[] | null>(null);
  const [fahrzeuge, setFahrzeuge] = useState<Fahrzeug[]>([]);
  const [funktionen, setFunktionen] = useState<FunktionEinsatz[]>([]);
  const [fehler, setFehler] = useState<string | null>(null);
  const [selectedEinsatzId, setSelectedEinsatzId] = useState<number | null>(null);

  async function laden() {
    try {
      const [e, f, fn] = await Promise.all([
        holeEinsaetze(),
        holeFahrzeuge(),
        holeFunktionenEinsatz(),
      ]);
      setEinsaetze(e);
      setFahrzeuge(f);
      setFunktionen(fn);
      setFehler(null);
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Einsätze konnten nicht geladen werden.");
    }
  }

  useEffect(() => {
    laden();
  }, []);

  if (fehler) return <div style={{ padding: "1rem", color: "red" }}>Fehler: {fehler}</div>;
  if (!einsaetze) return <p>Lädt …</p>;

  // Diagram mode - selected einsatz
  const ausgewaehlterEinsatz = einsaetze.find((e) => e.id === selectedEinsatzId) ?? null;
  if (ausgewaehlterEinsatz) {
    return (
      <EinsatzDiagramm
        einsatz={ausgewaehlterEinsatz}
        fahrzeuge={fahrzeuge}
        funktionen={funktionen}
        onAktualisiert={laden}
        onCancel={() => setSelectedEinsatzId(null)}
      />
    );
  }

  return (
    <div>
      <h1>Einsatztagebuch</h1>

      {einsaetze.length === 0 && <p>Keine aktiven Einsätze.</p>}
      {einsaetze.map((e) => (
        <div key={e.id} className="karte">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <strong>{e.titel}</strong>
              <div style={{ fontSize: "0.85rem", color: "#666" }}>
                {new Date(e.zeitpunkt).toLocaleString("de-DE")} · {e.quelle} · {e.teilnahmen.length} Teilnehmer
              </div>
            </div>
            <button onClick={() => setSelectedEinsatzId(e.id)}>Teilnehmen</button>
          </div>
        </div>
      ))}
    </div>
  );
}
