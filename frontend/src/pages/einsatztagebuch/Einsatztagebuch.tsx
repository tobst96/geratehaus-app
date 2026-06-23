import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { holeEinsaetze, einsatzAnlegen } from "../../api/einsaetze";
import { holeFahrzeuge, holeFunktionenEinsatz } from "../../api/stammdaten";
import { ApiError } from "../../api/client";
import { EinsatzDiagramm } from "./EinsatzDiagramm";
import type { EinsatzOut, Fahrzeug, FunktionEinsatz } from "../../api/types";

function jetztAlsDatetimeLocal(): string {
  const jetzt = new Date();
  jetzt.setMinutes(jetzt.getMinutes() - jetzt.getTimezoneOffset());
  return jetzt.toISOString().slice(0, 16);
}

export function Einsatztagebuch() {
  const [einsaetze, setEinsaetze] = useState<EinsatzOut[] | null>(null);
  const [fahrzeuge, setFahrzeuge] = useState<Fahrzeug[]>([]);
  const [funktionen, setFunktionen] = useState<FunktionEinsatz[]>([]);
  const [fehler, setFehler] = useState<string | null>(null);
  const [neuTitel, setNeuTitel] = useState("");
  const [neuZeitpunkt, setNeuZeitpunkt] = useState(jetztAlsDatetimeLocal());
  const [formularOffen, setFormularOffen] = useState(false);
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

  async function absenden(e: FormEvent) {
    e.preventDefault();
    if (!neuTitel.trim()) return;
    try {
      await einsatzAnlegen(neuTitel.trim(), new Date(neuZeitpunkt).toISOString());
      setNeuTitel("");
      setFormularOffen(false);
      await laden();
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Einsatz konnte nicht angelegt werden.");
    }
  }

  if (fehler) return <div style={{ padding: "1rem", color: "red" }}>Fehler: {fehler}</div>;
  if (!einsaetze) return <p>Lädt …</p>;

  // Diagram mode - selected einsatz
  if (selectedEinsatzId !== null) {
    return (
      <EinsatzDiagramm
        einsatzId={selectedEinsatzId}
        fahrzeuge={fahrzeuge}
        funktionen={funktionen}
        onSuccess={laden}
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
