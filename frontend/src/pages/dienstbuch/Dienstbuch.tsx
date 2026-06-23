import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  holeLetzteDienstbuecher,
  dienstbuchAnlegen,
  teilnehmerEintragen,
  dienstbuchPdfUrl,
} from "../../api/dienstbuecher";
import { ApiError } from "../../api/client";
import type { DienstbuchOut } from "../../api/types";

function jetztAlsDatetimeLocal(): string {
  const jetzt = new Date();
  jetzt.setMinutes(jetzt.getMinutes() - jetzt.getTimezoneOffset());
  return jetzt.toISOString().slice(0, 16);
}

export function Dienstbuch() {
  const { angezeigterName } = useAuth();
  const [dienstbuecher, setDienstbuecher] = useState<DienstbuchOut[] | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);

  const [formularOffen, setFormularOffen] = useState(false);
  const [titel, setTitel] = useState("");
  const [eroeffnetAm, setEroeffnetAm] = useState(jetztAlsDatetimeLocal());
  const [notizen, setNotizen] = useState("");

  async function laden() {
    try {
      setDienstbuecher(await holeLetzteDienstbuecher());
      setFehler(null);
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Dienstbücher konnten nicht geladen werden.");
    }
  }

  useEffect(() => {
    laden();
  }, []);

  async function anlegen(e: FormEvent) {
    e.preventDefault();
    if (!titel.trim()) return;
    try {
      await dienstbuchAnlegen(titel.trim(), new Date(eroeffnetAm).toISOString(), notizen || null);
      setTitel("");
      setNotizen("");
      setFormularOffen(false);
      await laden();
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Dienstbuch konnte nicht angelegt werden.");
    }
  }

  async function mitmachen(id: number) {
    try {
      await teilnehmerEintragen(id);
      await laden();
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Eintragung fehlgeschlagen.");
    }
  }

  if (fehler) return <div style={{ padding: "1rem", color: "red" }}>Fehler: {fehler}</div>;
  if (!dienstbuecher) return <p>Lädt …</p>;

  return (
    <div>
      <h1>Dienstbuch</h1>
      <p style={{ fontSize: "0.85rem", color: "#666" }}>
        Zeigt die zuletzt eröffneten Dienstbücher im konfigurierten Zeitfenster.
      </p>

      {!formularOffen && <button onClick={() => setFormularOffen(true)}>Neues Dienstbuch</button>}
      {formularOffen && (
        <form onSubmit={anlegen} className="karte">
          <label htmlFor="db-titel">Titel</label>
          <input id="db-titel" value={titel} onChange={(e) => setTitel(e.target.value)} required />
          <br />
          <br />
          <label htmlFor="db-zeitpunkt">Eröffnet am</label>
          <input
            id="db-zeitpunkt"
            type="datetime-local"
            value={eroeffnetAm}
            onChange={(e) => setEroeffnetAm(e.target.value)}
            required
          />
          <br />
          <br />
          <label htmlFor="db-notizen">Notizen (optional)</label>
          <textarea id="db-notizen" value={notizen} onChange={(e) => setNotizen(e.target.value)} rows={3} />
          <br />
          <br />
          <button type="submit">Anlegen</button>{" "}
          <button type="button" className="sekundaer" onClick={() => setFormularOffen(false)}>
            Abbrechen
          </button>
        </form>
      )}

      {dienstbuecher.length === 0 && <p>Keine aktuellen Dienstbücher.</p>}
      {dienstbuecher.map((d) => {
        const istDabei = d.teilnehmer.some((t) => t.person_name === angezeigterName);
        return (
          <div key={d.id} className="karte">
            <strong>{d.titel}</strong>
            <div style={{ fontSize: "0.85rem", color: "#666" }}>
              {new Date(d.eroeffnet_am).toLocaleString("de-DE")} · {d.teilnehmer.length} Teilnehmer
            </div>
            {d.notizen && <p>{d.notizen}</p>}
            <ul>
              {d.teilnehmer.map((t) => (
                <li key={t.id}>{t.person_name}</li>
              ))}
            </ul>
            {!istDabei && <button onClick={() => mitmachen(d.id)}>Ich war dabei</button>}{" "}
            <a href={dienstbuchPdfUrl(d.id)} target="_blank" rel="noreferrer">
              Als PDF exportieren
            </a>
          </div>
        );
      })}
    </div>
  );
}
