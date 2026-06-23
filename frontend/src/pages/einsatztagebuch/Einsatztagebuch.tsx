import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useStandort } from "../../context/StandortContext";
import { holeEinsaetze, einsatzAnlegen } from "../../api/einsaetze";
import { ApiError } from "../../api/client";
import { GeofenceFehler } from "../../components/GeofenceFehler";
import type { EinsatzOut } from "../../api/types";

function jetztAlsDatetimeLocal(): string {
  const jetzt = new Date();
  jetzt.setMinutes(jetzt.getMinutes() - jetzt.getTimezoneOffset());
  return jetzt.toISOString().slice(0, 16);
}

export function Einsatztagebuch() {
  const { position } = useStandort();
  const [einsaetze, setEinsaetze] = useState<EinsatzOut[] | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [neuTitel, setNeuTitel] = useState("");
  const [neuZeitpunkt, setNeuZeitpunkt] = useState(jetztAlsDatetimeLocal());
  const [formularOffen, setFormularOffen] = useState(false);

  async function laden() {
    if (!position) return;
    try {
      setEinsaetze(await holeEinsaetze(position));
      setFehler(null);
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Einsätze konnten nicht geladen werden.");
    }
  }

  useEffect(() => {
    laden();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position]);

  async function absenden(e: FormEvent) {
    e.preventDefault();
    if (!position || !neuTitel.trim()) return;
    try {
      await einsatzAnlegen(neuTitel.trim(), new Date(neuZeitpunkt).toISOString(), position);
      setNeuTitel("");
      setFormularOffen(false);
      await laden();
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Einsatz konnte nicht angelegt werden.");
    }
  }

  if (fehler) return <GeofenceFehler nachricht={fehler} />;
  if (!einsaetze) return <p>Lädt …</p>;

  return (
    <div>
      <h1>Einsatztagebuch</h1>

      {!formularOffen && <button onClick={() => setFormularOffen(true)}>Neuer Einsatz</button>}
      {formularOffen && (
        <form onSubmit={absenden} className="karte">
          <label htmlFor="einsatz-titel">Titel</label>
          <input
            id="einsatz-titel"
            value={neuTitel}
            onChange={(e) => setNeuTitel(e.target.value)}
            required
          />
          <br />
          <br />
          <label htmlFor="einsatz-zeitpunkt">Zeitpunkt</label>
          <input
            id="einsatz-zeitpunkt"
            type="datetime-local"
            value={neuZeitpunkt}
            onChange={(e) => setNeuZeitpunkt(e.target.value)}
            required
          />
          <br />
          <br />
          <button type="submit">Anlegen</button>{" "}
          <button type="button" className="sekundaer" onClick={() => setFormularOffen(false)}>
            Abbrechen
          </button>
        </form>
      )}

      {einsaetze.length === 0 && <p>Keine Einsätze vorhanden.</p>}
      {einsaetze.map((e) => (
        <Link key={e.id} to={`/einsatztagebuch/${e.id}`} className="karte" style={{ display: "block" }}>
          <strong>{e.titel}</strong>
          <div style={{ fontSize: "0.85rem", color: "#666" }}>
            {new Date(e.zeitpunkt).toLocaleString("de-DE")} · {e.quelle} · {e.teilnahmen.length} Teilnehmer
          </div>
        </Link>
      ))}
    </div>
  );
}
