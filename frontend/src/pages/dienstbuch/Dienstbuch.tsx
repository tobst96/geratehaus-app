import { useEffect, useState, type FormEvent } from "react";
import { holeLetzteDienstbuecher, dienstbuchAnlegen, holeDienstbuchFelder } from "../../api/dienstbuecher";
import { holeGruppen } from "../../api/stammdaten";
import { ApiError } from "../../api/client";
import { DienstbuchDiagramm } from "./DienstbuchDiagramm";
import { Ladeanzeige } from "../../components/Ladeanzeige";
import { SeitenFehler } from "../../components/SeitenFehler";
import { formatiereDatumZeit } from "../../utils/datum";
import type { DienstbuchFeldDefinition, DienstbuchOut, Gruppe } from "../../api/types";

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

  const [felder, setFelder] = useState<DienstbuchFeldDefinition[]>([]);
  const [formularOffen, setFormularOffen] = useState(false);
  const [titel, setTitel] = useState("");
  const [eroeffnetAm, setEroeffnetAm] = useState(jetztAlsDatetimeLocal());
  const [notizen, setNotizen] = useState("");
  const [zusatzfelder, setZusatzfelder] = useState<Record<string, string | boolean>>({});

  async function laden() {
    try {
      const [d, g, f] = await Promise.all([
        holeLetzteDienstbuecher(),
        holeGruppen(),
        holeDienstbuchFelder(),
      ]);
      setDienstbuecher(d);
      setGruppen(g);
      setFelder(f);
      setFehler(null);
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Dienstbücher konnten nicht geladen werden.");
    }
  }

  function feldWert(schluessel: string): string | boolean {
    return zusatzfelder[schluessel] ?? "";
  }

  function feldSetzen(schluessel: string, wert: string | boolean) {
    setZusatzfelder((z) => ({ ...z, [schluessel]: wert }));
  }

  useEffect(() => {
    laden();
  }, []);

  if (fehler) return <SeitenFehler nachricht={fehler} onRetry={laden} />;
  if (!dienstbuecher) return <Ladeanzeige />;

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
      const neu = await dienstbuchAnlegen(
        titel.trim(),
        new Date(eroeffnetAm).toISOString(),
        notizen || null,
        zusatzfelder
      );
      setTitel("");
      setNotizen("");
      setZusatzfelder({});
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
      <p style={{ fontSize: "0.85rem", color: "var(--farbe-text-mute)" }}>
        Zeigt die zuletzt eröffneten Dienstbücher im konfigurierten Zeitfenster.
      </p>

      {!formularOffen && <button style={{ marginBottom: 16 }} onClick={() => setFormularOffen(true)}>Neues Dienstbuch</button>}
      {formularOffen && (
        <form onSubmit={anlegen} className="karte" style={{ marginBottom: 16 }}>
          <div className="formular-feld">
            <label htmlFor="db-titel">Titel</label>
            <input id="db-titel" value={titel} onChange={(e) => setTitel(e.target.value)} required />
          </div>
          <div className="formular-feld">
            <label htmlFor="db-zeitpunkt">Eröffnet am</label>
            <input
              id="db-zeitpunkt"
              type="datetime-local"
              value={eroeffnetAm}
              onChange={(e) => setEroeffnetAm(e.target.value)}
              required
            />
          </div>
          <div className="formular-feld">
            <label htmlFor="db-notizen">Notizen (optional)</label>
            <textarea id="db-notizen" value={notizen} onChange={(e) => setNotizen(e.target.value)} rows={3} />
          </div>
          {felder.map((f) => (
            <div className="formular-feld" key={f.id}>
              <label htmlFor={`db-feld-${f.id}`}>{f.label}</label>
              {f.typ === "mehrzeilig" ? (
                <textarea
                  id={`db-feld-${f.id}`}
                  value={String(feldWert(f.schluessel) || "")}
                  onChange={(e) => feldSetzen(f.schluessel, e.target.value)}
                  rows={3}
                />
              ) : f.typ === "checkbox" ? (
                <input
                  id={`db-feld-${f.id}`}
                  type="checkbox"
                  checked={feldWert(f.schluessel) === true}
                  onChange={(e) => feldSetzen(f.schluessel, e.target.checked)}
                />
              ) : f.typ === "auswahl" ? (
                <select
                  id={`db-feld-${f.id}`}
                  value={String(feldWert(f.schluessel) || "")}
                  onChange={(e) => feldSetzen(f.schluessel, e.target.value)}
                >
                  <option value="">– bitte wählen –</option>
                  {f.optionen.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={`db-feld-${f.id}`}
                  value={String(feldWert(f.schluessel) || "")}
                  onChange={(e) => feldSetzen(f.schluessel, e.target.value)}
                />
              )}
            </div>
          ))}
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
              <div style={{ fontSize: "0.85rem", color: "var(--farbe-text-mute)" }}>
                {formatiereDatumZeit(d.eroeffnet_am)} · {d.teilnehmer.length} Teilnehmer
              </div>
              {d.notizen && <p style={{ margin: "0.25rem 0 0" }}>{d.notizen}</p>}
              {felder
                .filter((f) => {
                  const w = d.zusatzfelder?.[f.schluessel];
                  return w !== undefined && w !== "" && w !== false;
                })
                .map((f) => {
                  const w = d.zusatzfelder[f.schluessel];
                  return (
                    <div key={f.id} style={{ fontSize: "0.85rem" }}>
                      <strong>{f.label}:</strong> {w === true ? "Ja" : String(w)}
                    </div>
                  );
                })}
            </div>
            <button onClick={() => setSelectedDienstbuchId(d.id)}>Öffnen</button>
          </div>
        </div>
      ))}
    </div>
  );
}
