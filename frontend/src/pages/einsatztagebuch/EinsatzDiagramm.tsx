import { useState, type FormEvent } from "react";
import { teilnahmeEintragen } from "../../api/einsaetze";
import { ApiError } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import type { EinsatzOut, Fahrzeug, FunktionEinsatz, TeilnahmeOut } from "../../api/types";
import "./EinsatzDiagramm.css";

interface EinsatzDiagrammProps {
  einsatz: EinsatzOut;
  fahrzeuge: Fahrzeug[];
  funktionen: FunktionEinsatz[];
  onAktualisiert: () => Promise<void>;
  onCancel: () => void;
}

interface AusgewaehlterSitz {
  fahrzeug: Fahrzeug;
  sitzplatzId: string;
  bezeichnung: string;
}

export function EinsatzDiagramm({ einsatz, fahrzeuge, onAktualisiert, onCancel }: EinsatzDiagrammProps) {
  const { barcodeEinscannen } = useAuth();
  const [ausgewaehlterSitz, setAusgewaehlterSitz] = useState<AusgewaehlterSitz | null>(null);
  const [barcode, setBarcode] = useState("");
  const [vab, setVab] = useState(false);
  const [atemschutzminuten, setAtemschutzminuten] = useState(0);
  const [fehler, setFehler] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);

  const belegungByKey = new Map<string, TeilnahmeOut>();
  for (const t of einsatz.teilnahmen) {
    if (t.fahrzeug_id != null && t.sitzplatz_id != null) {
      belegungByKey.set(`${t.fahrzeug_id}:${t.sitzplatz_id}`, t);
    }
  }

  function sitzKlick(fahrzeug: Fahrzeug, sitzplatzId: string, bezeichnung: string) {
    setAusgewaehlterSitz({ fahrzeug, sitzplatzId, bezeichnung });
    setBarcode("");
    setVab(false);
    setAtemschutzminuten(0);
    setFehler(null);
  }

  async function eintragen(e: FormEvent) {
    e.preventDefault();
    if (!ausgewaehlterSitz || !barcode.trim()) {
      setFehler("Barcode erforderlich");
      return;
    }
    setLaeuft(true);
    setFehler(null);
    try {
      await barcodeEinscannen(barcode.trim());
      await teilnahmeEintragen(einsatz.id, {
        fahrzeug_id: ausgewaehlterSitz.fahrzeug.id,
        sitzplatz_id: ausgewaehlterSitz.sitzplatzId,
        funktion_id: null,
        vab,
        atemschutzminuten,
        nur_geraetehaus: false,
      });
      await onAktualisiert();
      setAusgewaehlterSitz(null);
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Eintragung fehlgeschlagen.");
    } finally {
      setLaeuft(false);
    }
  }

  const aktiveFahrzeuge = fahrzeuge.filter((f) => f.aktiv);

  return (
    <div>
      <h2>{einsatz.titel} – Garage</h2>
      <p style={{ color: "#666", fontSize: "0.9rem" }}>
        Sitzplatz im jeweiligen Fahrzeug anklicken und Barcode scannen, um sich einzutragen.
      </p>

      <div className="garage">
        <div className="garage-fahrzeuge">
          {aktiveFahrzeuge.map((f) => (
            <div key={f.id} className="fahrzeug-kasten">
              <div className="fahrzeug-kasten-titel">{f.name}</div>
              <div className="fahrzeug-kasten-flaeche">
                {f.sitzplaetze.length === 0 && (
                  <div className="fahrzeug-kasten-leer">
                    Keine Sitzplätze konfiguriert. In den Stammdaten einrichten.
                  </div>
                )}
                {f.sitzplaetze.map((s) => {
                  const belegung = belegungByKey.get(`${f.id}:${s.id}`);
                  if (belegung) {
                    return (
                      <div
                        key={s.id}
                        className="sitzplatz sitzplatz-belegt"
                        style={{ left: `${s.x}%`, top: `${s.y}%` }}
                        title={`${s.bezeichnung}: ${belegung.person_name}`}
                      >
                        <span>
                          ✓<br />
                          <span className="sitzplatz-belegt-name">{belegung.person_name}</span>
                        </span>
                      </div>
                    );
                  }
                  return (
                    <button
                      key={s.id}
                      type="button"
                      className="sitzplatz sitzplatz-frei"
                      style={{ left: `${s.x}%`, top: `${s.y}%` }}
                      onClick={() => sitzKlick(f, s.id, s.bezeichnung)}
                      title={s.bezeichnung}
                    >
                      {s.bezeichnung}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: "1.5rem" }}>
        <button className="sekundaer" onClick={onCancel}>
          Zurück
        </button>
      </div>

      {ausgewaehlterSitz && (
        <div className="sitzplatz-scan-overlay" onClick={() => setAusgewaehlterSitz(null)}>
          <form
            onSubmit={eintragen}
            className="karte sitzplatz-scan-karte"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>
              {ausgewaehlterSitz.fahrzeug.name} – {ausgewaehlterSitz.bezeichnung}
            </h3>

            <label htmlFor="ed-barcode">Barcode einscannen</label>
            <input
              id="ed-barcode"
              type="text"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="Barcode scannen oder eingeben"
              autoFocus
              required
            />
            <br />
            <br />

            <label>
              <input type="checkbox" checked={vab} onChange={(e) => setVab(e.target.checked)} /> VAB
            </label>
            <br />
            <br />

            <label htmlFor="ed-atemschutz">Atemschutzminuten</label>
            <input
              id="ed-atemschutz"
              type="number"
              min={0}
              value={atemschutzminuten}
              onChange={(e) => setAtemschutzminuten(Number(e.target.value))}
            />
            <br />
            <br />

            {fehler && <p className="fehlertext">{fehler}</p>}

            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" disabled={laeuft}>
                {laeuft ? "Wird gespeichert…" : "Eintragen"}
              </button>
              <button type="button" className="sekundaer" onClick={() => setAusgewaehlterSitz(null)}>
                Abbrechen
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
