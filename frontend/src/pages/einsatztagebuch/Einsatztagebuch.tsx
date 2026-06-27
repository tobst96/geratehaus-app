import { useEffect, useRef, useState, type FormEvent } from "react";
import { einsatzAnlegen, holeEinsaetze } from "../../api/einsaetze";
import { holeFahrzeuge, holeFunktionenEinsatz } from "../../api/stammdaten";
import { ApiError } from "../../api/client";
import { EinsatzDiagramm } from "./EinsatzDiagramm";
import { Ladeanzeige } from "../../components/Ladeanzeige";
import type { EinsatzOut, Fahrzeug, FunktionEinsatz } from "../../api/types";

const POLL_INTERVALL_MS = 15_000;

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
  const [selectedEinsatzId, setSelectedEinsatzId] = useState<number | null>(null);
  const [formularOffen, setFormularOffen] = useState(false);
  const [neuerTitel, setNeuerTitel] = useState("");
  const [neuerZeitpunkt, setNeuerZeitpunkt] = useState(jetztAlsDatetimeLocal());

  const bekannteIds = useRef<Set<number> | null>(null);
  const selectedEinsatzIdRef = useRef<number | null>(null);
  selectedEinsatzIdRef.current = selectedEinsatzId;

  async function laden() {
    try {
      const [e, f, fn] = await Promise.all([
        holeEinsaetze(),
        holeFahrzeuge(),
        holeFunktionenEinsatz(),
      ]);

      if (bekannteIds.current === null) {
        // Erster Ladevorgang: nur merken, nicht automatisch öffnen.
        bekannteIds.current = new Set(e.map((x) => x.id));
      } else if (selectedEinsatzIdRef.current === null) {
        const neue = e.filter((x) => !bekannteIds.current!.has(x.id) && !x.archiviert);
        bekannteIds.current = new Set(e.map((x) => x.id));
        if (neue.length > 0) {
          // Automatisch (z. B. via Divera) neu hinzugekommener Einsatz: direkt öffnen.
          const neuester = neue.reduce((a, b) => (new Date(a.zeitpunkt) > new Date(b.zeitpunkt) ? a : b));
          setSelectedEinsatzId(neuester.id);
        }
      }

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
    const intervall = setInterval(laden, POLL_INTERVALL_MS);
    return () => clearInterval(intervall);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (fehler) return <div style={{ padding: "1rem", color: "red" }}>Fehler: {fehler}</div>;
  if (!einsaetze) return <Ladeanzeige />;

  // Im Gerätehaus-Kiosk sollen nur offene Einsätze erscheinen – abgeschlossene
  // sind hier nicht mehr relevant.
  const offeneEinsaetze = einsaetze.filter((e) => e.status === "offen");

  // Diagram mode - selected einsatz
  const ausgewaehlterEinsatz = offeneEinsaetze.find((e) => e.id === selectedEinsatzId) ?? null;
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

  async function einsatzManuellAnlegen(e: FormEvent) {
    e.preventDefault();
    if (!neuerTitel.trim()) return;
    const neuerEinsatz = await einsatzAnlegen(neuerTitel.trim(), new Date(neuerZeitpunkt).toISOString());
    setNeuerTitel("");
    setNeuerZeitpunkt(jetztAlsDatetimeLocal());
    setFormularOffen(false);
    await laden();
    setSelectedEinsatzId(neuerEinsatz.id);
  }

  return (
    <div>
      <h1>Einsatztagebuch</h1>

      {!formularOffen && (
        <button style={{ marginBottom: 16 }} onClick={() => setFormularOffen(true)}>
          Neuer Einsatz
        </button>
      )}
      {formularOffen && (
        <form onSubmit={einsatzManuellAnlegen} className="karte" style={{ marginBottom: 16 }}>
          <div className="formular-feld">
            <label htmlFor="e-titel">Titel</label>
            <input
              id="e-titel"
              value={neuerTitel}
              onChange={(e) => setNeuerTitel(e.target.value)}
              placeholder="z. B. Verkehrsunfall B 401"
              required
            />
          </div>
          <div className="formular-feld">
            <label htmlFor="e-zeitpunkt">Zeitpunkt</label>
            <input
              id="e-zeitpunkt"
              type="datetime-local"
              value={neuerZeitpunkt}
              onChange={(e) => setNeuerZeitpunkt(e.target.value)}
              required
            />
          </div>
          <button type="submit">Anlegen</button>{" "}
          <button type="button" className="sekundaer" onClick={() => setFormularOffen(false)}>
            Abbrechen
          </button>
        </form>
      )}

      {offeneEinsaetze.length === 0 && <p>Keine aktiven Einsätze.</p>}
      {offeneEinsaetze.map((e) => (
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
