import { useEffect, useState, type FormEvent } from "react";
import {
  holeLetzteDienstbuecher,
  dienstbuchAnlegen,
  dienstbuchPdfUrl,
} from "../../api/dienstbuecher";
import { holeGruppen } from "../../api/stammdaten";
import { ApiError } from "../../api/client";
import { DienstbuchDiagramm } from "./DienstbuchDiagramm";
import type { DienstbuchOut, Gruppe } from "../../api/types";

function jetztAlsDatetimeLocal(): string {
  const jetzt = new Date();
  jetzt.setMinutes(jetzt.getMinutes() - jetzt.getTimezoneOffset());
  return jetzt.toISOString().slice(0, 16);
}

export function Dienstbuch() {
  const [dienstbuecher, setDienstbuecher] = useState<DienstbuchOut[] | null>(null);
  const [gruppen, setGruppen] = useState<Gruppe[]>([]);
  const [fehler, setFehler] = useState<string | null>(null);
  const [selectedDienstbuchId, setSelectedDienstbuchId] = useState<number | null>(null);

  const [formularOffen, setFormularOffen] = useState(false);
  const [titel, setTitel] = useState("");
  const [eroeffnetAm, setEroeffnetAm] = useState(jetztAlsDatetimeLocal());
  const [notizen, setNotizen] = useState("");

  async function laden() {
    try {
      const [d, g] = await Promise.all([holeLetzteDienstbuecher(), holeGruppen()]);
      setDienstbuecher(d);
      setGruppen(g);
      setFehler(null);
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Dienstbücher konnten nicht geladen werden.");
    }
  }

  useEffect(() => {
    laden();
  }, []);

  if (fehler) return <div style={{ padding: "1rem", color: "red" }}>Fehler: {fehler}</div>;
  if (!dienstbuecher) return <p>Lädt …</p>;

  const ausgewaehltesDienstbuch = dienstbuecher.find((d) => d.id === selectedDienstbuchId) ?? null;
  if (ausgewaehltesDienstbuch) {
    return (
      <DienstbuchDiagramm
        dienstbuch={ausgewaehltesDienstbuch}
        gruppen={gruppen}
        onAktualisiert={laden}
        onCancel={() => setSelectedDienstbuchId(null)}
      />
    );
  }

  async function anlegen(e: FormEvent) {
    e.preventDefault();
    if (!titel.trim()) return;
    try {
      const neu = await dienstbuchAnlegen(titel.trim(), new Date(eroeffnetAm).toISOString(), notizen || null);
      setTitel("");
      setNotizen("");
      setFormularOffen(false);
      await laden();
      setSelectedDienstbuchId(neu.id);
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Dienstbuch konnte nicht angelegt werden.");
    }
  }

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
      {dienstbuecher.map((d) => (
        <div key={d.id} className="karte">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <strong>{d.titel}</strong>
              <div style={{ fontSize: "0.85rem", color: "#666" }}>
                {new Date(d.eroeffnet_am).toLocaleString("de-DE")} · {d.teilnehmer.length} Teilnehmer
              </div>
              {d.notizen && <p style={{ margin: "0.25rem 0 0" }}>{d.notizen}</p>}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <a href={dienstbuchPdfUrl(d.id)} target="_blank" rel="noreferrer">
                Als PDF exportieren
              </a>
              <button onClick={() => setSelectedDienstbuchId(d.id)}>Öffnen</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
