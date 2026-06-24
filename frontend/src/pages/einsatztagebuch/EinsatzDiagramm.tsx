import { useEffect, useState, type FormEvent } from "react";
import { einsatzZusatzfelderAktualisieren, holeEinsatzFelder, teilnahmeEintragen } from "../../api/einsaetze";
import { ApiError } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import type { EinsatzFeldDefinition, EinsatzOut, Fahrzeug, FunktionEinsatz, TeilnahmeOut } from "../../api/types";
import "./EinsatzDiagramm.css";

interface EinsatzDiagrammProps {
  einsatz: EinsatzOut;
  fahrzeuge: Fahrzeug[];
  funktionen: FunktionEinsatz[];
  onAktualisiert: () => Promise<void>;
  onCancel: () => void;
}

interface AusgewaehlteAktion {
  fahrzeug: Fahrzeug | null;
  sitzplatzId: string | null;
  bezeichnung: string;
  nurGeraetehaus: boolean;
}

const AGT_MAX_MINUTEN = 35;

export function EinsatzDiagramm({ einsatz, fahrzeuge, onAktualisiert, onCancel }: EinsatzDiagrammProps) {
  const { barcodeEinscannen } = useAuth();
  const [aktivesFahrzeugId, setAktivesFahrzeugId] = useState<number | null>(null);
  const [ausgewaehlteAktion, setAusgewaehlteAktion] = useState<AusgewaehlteAktion | null>(null);
  const [barcode, setBarcode] = useState("");
  const [vab, setVab] = useState(false);
  const [atemschutzminuten, setAtemschutzminuten] = useState(0);
  const [bemerkung, setBemerkung] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);

  const [felder, setFelder] = useState<EinsatzFeldDefinition[] | null>(null);
  const [feldWerte, setFeldWerte] = useState<Record<string, string | boolean>>(einsatz.zusatzfelder);
  const [felderSpeichern, setFelderSpeichern] = useState(false);

  useEffect(() => {
    holeEinsatzFelder().then(setFelder).catch(() => setFelder([]));
  }, []);

  useEffect(() => {
    setFeldWerte(einsatz.zusatzfelder);
  }, [einsatz.zusatzfelder]);

  const belegungByKey = new Map<string, TeilnahmeOut>();
  for (const t of einsatz.teilnahmen) {
    if (t.fahrzeug_id != null && t.sitzplatz_id != null) {
      belegungByKey.set(`${t.fahrzeug_id}:${t.sitzplatz_id}`, t);
    }
  }
  const geraetehausTeilnehmer = einsatz.teilnahmen.filter((t) => t.nur_geraetehaus);

  function teilnehmerZahl(fahrzeugId: number): number {
    return einsatz.teilnahmen.filter((t) => t.fahrzeug_id === fahrzeugId).length;
  }

  function sitzKlick(fahrzeug: Fahrzeug, sitzplatzId: string, bezeichnung: string) {
    setAusgewaehlteAktion({ fahrzeug, sitzplatzId, bezeichnung, nurGeraetehaus: false });
    setBarcode("");
    setVab(false);
    setAtemschutzminuten(0);
    setBemerkung("");
    setFehler(null);
  }

  function geraetehausKlick() {
    setAusgewaehlteAktion({
      fahrzeug: null,
      sitzplatzId: null,
      bezeichnung: "Einsatzbereit im Feuerwehrhaus",
      nurGeraetehaus: true,
    });
    setBarcode("");
    setVab(false);
    setAtemschutzminuten(0);
    setBemerkung("");
    setFehler(null);
  }

  async function eintragen(e: FormEvent) {
    e.preventDefault();
    if (!ausgewaehlteAktion || !barcode.trim()) {
      setFehler("Barcode erforderlich");
      return;
    }
    setLaeuft(true);
    setFehler(null);
    try {
      await barcodeEinscannen(barcode.trim());
      await teilnahmeEintragen(einsatz.id, {
        fahrzeug_id: ausgewaehlteAktion.fahrzeug?.id ?? null,
        sitzplatz_id: ausgewaehlteAktion.sitzplatzId,
        funktion_id: null,
        vab,
        atemschutzminuten,
        nur_geraetehaus: ausgewaehlteAktion.nurGeraetehaus,
        bemerkung: bemerkung.trim() || null,
      });
      await onAktualisiert();
      setAusgewaehlteAktion(null);
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Eintragung fehlgeschlagen.");
    } finally {
      setLaeuft(false);
    }
  }

  async function feldWertAendern(schluessel: string, wert: string | boolean) {
    setFeldWerte((vorher) => ({ ...vorher, [schluessel]: wert }));
  }

  async function felderSpeichernKlick() {
    setFelderSpeichern(true);
    try {
      await einsatzZusatzfelderAktualisieren(einsatz.id, feldWerte);
      await onAktualisiert();
    } finally {
      setFelderSpeichern(false);
    }
  }

  const aktiveFahrzeuge = fahrzeuge.filter((f) => f.aktiv);
  const aktivesFahrzeug = aktiveFahrzeuge.find((f) => f.id === aktivesFahrzeugId) ?? null;

  return (
    <div>
      <h2>{einsatz.titel}</h2>

      {!aktivesFahrzeug && felder && felder.length > 0 && (
        <div className="karte">
          <h3>Einsatzdetails</h3>
          {felder.map((f) => (
            <div key={f.schluessel} style={{ marginBottom: "0.75rem" }}>
              {f.typ === "checkbox" ? (
                <label>
                  <input
                    type="checkbox"
                    checked={Boolean(feldWerte[f.schluessel])}
                    onChange={(e) => feldWertAendern(f.schluessel, e.target.checked)}
                  />{" "}
                  {f.label}
                </label>
              ) : (
                <>
                  <label htmlFor={`feld-${f.schluessel}`}>{f.label}</label>
                  {f.typ === "mehrzeilig" ? (
                    <textarea
                      id={`feld-${f.schluessel}`}
                      rows={3}
                      value={String(feldWerte[f.schluessel] ?? "")}
                      onChange={(e) => feldWertAendern(f.schluessel, e.target.value)}
                    />
                  ) : (
                    <input
                      id={`feld-${f.schluessel}`}
                      type="text"
                      value={String(feldWerte[f.schluessel] ?? "")}
                      onChange={(e) => feldWertAendern(f.schluessel, e.target.value)}
                    />
                  )}
                </>
              )}
            </div>
          ))}
          <button onClick={felderSpeichernKlick} disabled={felderSpeichern}>
            {felderSpeichern ? "Speichert …" : "Einsatzdetails speichern"}
          </button>
        </div>
      )}

      {!aktivesFahrzeug && (
        <>
          <p style={{ color: "#666", fontSize: "0.9rem" }}>
            Fahrzeug auswählen, um Sitzplätze zu belegen.
          </p>
          <div className="fahrzeug-buttons">
            {aktiveFahrzeuge.map((f) => (
              <button key={f.id} type="button" className="fahrzeug-button" onClick={() => setAktivesFahrzeugId(f.id)}>
                <span className="fahrzeug-button-name">{f.name}</span>
                <span className="fahrzeug-button-zahl">{teilnehmerZahl(f.id)} eingetragen</span>
              </button>
            ))}
            <button type="button" className="fahrzeug-button fahrzeug-button-geraetehaus" onClick={geraetehausKlick}>
              <span className="fahrzeug-button-name">Einsatzbereit im Feuerwehrhaus</span>
              <span className="fahrzeug-button-zahl">{geraetehausTeilnehmer.length} eingetragen</span>
            </button>
          </div>

          {geraetehausTeilnehmer.length > 0 && (
            <div className="karte" style={{ marginTop: "1.5rem" }}>
              <h3>Einsatzbereit im Feuerwehrhaus</h3>
              <ul>
                {geraetehausTeilnehmer.map((t) => (
                  <li key={t.id}>
                    {t.person_name}
                    {t.bemerkung ? ` – ${t.bemerkung}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div style={{ marginTop: "1.5rem" }}>
            <button className="sekundaer" onClick={onCancel}>
              Zurück
            </button>
          </div>
        </>
      )}

      {aktivesFahrzeug && (
        <div className="garage garage-aktiv">
          <div className="fahrzeug-kasten fahrzeug-kasten-aktiv">
            <div className="fahrzeug-kasten-titel">{aktivesFahrzeug.name}</div>
            <div className="fahrzeug-kasten-flaeche fahrzeug-kasten-flaeche-aktiv">
              {aktivesFahrzeug.sitzplaetze.length === 0 && (
                <div className="fahrzeug-kasten-leer">
                  Keine Sitzplätze konfiguriert. In den Stammdaten einrichten.
                </div>
              )}
              {aktivesFahrzeug.sitzplaetze.map((s) => {
                const belegung = belegungByKey.get(`${aktivesFahrzeug.id}:${s.id}`);
                if (belegung) {
                  return (
                    <div
                      key={s.id}
                      className="sitzplatz sitzplatz-belegt"
                      style={{ left: `${s.x}%`, top: `${s.y}%` }}
                      title={`${s.bezeichnung}: ${belegung.person_name}${belegung.bemerkung ? " – " + belegung.bemerkung : ""}`}
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
                    onClick={() => sitzKlick(aktivesFahrzeug, s.id, s.bezeichnung)}
                    title={s.bezeichnung}
                  >
                    {s.bezeichnung}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ marginTop: "0.75rem" }}>
            <button className="sekundaer" onClick={() => setAktivesFahrzeugId(null)}>
              Zurück zur Übersicht
            </button>
          </div>
        </div>
      )}

      {ausgewaehlteAktion && (
        <div className="sitzplatz-scan-overlay" onClick={() => setAusgewaehlteAktion(null)}>
          <form
            onSubmit={eintragen}
            className="karte sitzplatz-scan-karte"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>
              {ausgewaehlteAktion.fahrzeug ? `${ausgewaehlteAktion.fahrzeug.name} – ` : ""}
              {ausgewaehlteAktion.bezeichnung}
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

            {!ausgewaehlteAktion.nurGeraetehaus && (
              <>
                <label>
                  <input type="checkbox" checked={vab} onChange={(e) => setVab(e.target.checked)} /> VAB
                </label>
                <br />
                <br />

                <label htmlFor="ed-atemschutz">
                  Atemschutzminuten: <strong>{atemschutzminuten}</strong>
                </label>
                <input
                  id="ed-atemschutz"
                  type="range"
                  min={0}
                  max={AGT_MAX_MINUTEN}
                  step={1}
                  value={atemschutzminuten}
                  onChange={(e) => setAtemschutzminuten(Number(e.target.value))}
                  style={{ width: "100%" }}
                />
                <br />
                <br />
              </>
            )}

            <label htmlFor="ed-bemerkung">Bemerkung (optional)</label>
            <textarea
              id="ed-bemerkung"
              rows={2}
              value={bemerkung}
              onChange={(e) => setBemerkung(e.target.value)}
              placeholder="Notizen…"
            />
            <br />
            <br />

            {fehler && <p className="fehlertext">{fehler}</p>}

            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" disabled={laeuft}>
                {laeuft ? "Wird gespeichert…" : "Eintragen"}
              </button>
              <button type="button" className="sekundaer" onClick={() => setAusgewaehlteAktion(null)}>
                Abbrechen
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
