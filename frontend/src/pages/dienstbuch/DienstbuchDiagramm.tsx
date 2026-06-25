import { useEffect, useRef, useState, type FormEvent } from "react";
import { teilnehmerEintragen } from "../../api/dienstbuecher";
import { barcodeVorschau, type BarcodeVorschau } from "../../api/auth";
import { ApiError } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import type { DienstbuchOut, Gruppe } from "../../api/types";
import "./DienstbuchDiagramm.css";

function initialenAus(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((teil) => teil.charAt(0))
    .join("")
    .toUpperCase();
}

interface DienstbuchDiagrammProps {
  dienstbuch: DienstbuchOut;
  gruppen: Gruppe[];
  onAktualisiert: () => Promise<void>;
  onCancel: () => void;
}

const AGT_MAX_MINUTEN = 35;
const AGT_DEFAULT_MINUTEN = 30;

export function DienstbuchDiagramm({ dienstbuch, gruppen, onAktualisiert, onCancel }: DienstbuchDiagrammProps) {
  const { barcodeEinscannen } = useAuth();
  const [barcode, setBarcode] = useState("");
  const [vorschau, setVorschau] = useState<BarcodeVorschau | null>(null);
  const [gruppeId, setGruppeId] = useState<number | null>(null);
  const [atemschutzAktiv, setAtemschutzAktiv] = useState(false);
  const [atemschutzminuten, setAtemschutzminuten] = useState(0);
  const [fehler, setFehler] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);

  const letzteVorschauName = useRef<string | null>(null);

  // Live-Vorschau (Name + Bild) während des Scannens, debounced, damit nicht
  // bei jedem Tastendruck ein Request raus geht.
  useEffect(() => {
    const wert = barcode.trim();
    if (!wert) {
      setVorschau(null);
      letzteVorschauName.current = null;
      return;
    }
    const timeout = setTimeout(() => {
      barcodeVorschau(wert)
        .then((ergebnis) => {
          setVorschau(ergebnis);
          // Gruppe nur beim erstmaligen Auflösen einer Person vorschlagen,
          // damit eine manuelle Änderung nicht bei jedem Debounce überschrieben wird.
          if (letzteVorschauName.current !== ergebnis.name) {
            letzteVorschauName.current = ergebnis.name;
            setGruppeId(ergebnis.gruppe_id);
          }
        })
        .catch(() => {
          setVorschau(null);
          letzteVorschauName.current = null;
        });
    }, 250);
    return () => clearTimeout(timeout);
  }, [barcode]);

  function zuruecksetzen() {
    setBarcode("");
    setVorschau(null);
    setGruppeId(null);
    setAtemschutzAktiv(false);
    setAtemschutzminuten(0);
    letzteVorschauName.current = null;
  }

  async function eintragen(e: FormEvent) {
    e.preventDefault();
    if (!barcode.trim()) {
      setFehler("Barcode erforderlich");
      return;
    }
    setLaeuft(true);
    setFehler(null);
    try {
      await barcodeEinscannen(barcode.trim());
      await teilnehmerEintragen(dienstbuch.id, {
        gruppe_id: gruppeId,
        atemschutzminuten: atemschutzAktiv ? atemschutzminuten : 0,
      });
      await onAktualisiert();
      zuruecksetzen();
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Eintragung fehlgeschlagen.");
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <div>
      <div className="dienstbuch-diagramm-kopf">
        <h2 style={{ margin: 0 }}>{dienstbuch.titel}</h2>
        <button className="sekundaer" onClick={onCancel}>
          Zurück
        </button>
      </div>

      <div className="dienstbuch-diagramm-layout">
        <div className="dienstbuch-diagramm-spalte">
          <div className="karte">
            <h3 style={{ marginTop: 0 }}>Dienstbuchdetails</h3>
            <p>Eröffnet am: {new Date(dienstbuch.eroeffnet_am).toLocaleString("de-DE")}</p>
            {dienstbuch.notizen && <p>{dienstbuch.notizen}</p>}
            <p>{dienstbuch.teilnehmer.length} Teilnehmer</p>
          </div>
        </div>

        <div className="dienstbuch-diagramm-spalte">
          <form onSubmit={eintragen} className="karte dienstbuch-scan-karte">
            <h3 style={{ marginTop: 0 }}>Barcode scannen</h3>
            <div className="dienstbuch-scan-layout">
              {vorschau && (
                <div className="dienstbuch-scan-vorschau">
                  {vorschau.bild_url ? (
                    <img src={vorschau.bild_url} alt={vorschau.name} className="dienstbuch-scan-bild" />
                  ) : (
                    <div className="dienstbuch-scan-initialen">{initialenAus(vorschau.name)}</div>
                  )}
                  <div className="dienstbuch-scan-name">{vorschau.name}</div>
                </div>
              )}

              <div className="dienstbuch-scan-felder">
                <label htmlFor="db-barcode">Barcode einscannen</label>
                <input
                  id="db-barcode"
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="Barcode scannen oder eingeben"
                  autoFocus
                  required
                />
                <br />
                <br />

                <label htmlFor="db-gruppe">Gruppe</label>
                <select
                  id="db-gruppe"
                  value={gruppeId ?? ""}
                  onChange={(e) => setGruppeId(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">– keine –</option>
                  {gruppen.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
                <br />
                <br />

                <label>
                  <input
                    type="checkbox"
                    checked={atemschutzAktiv}
                    onChange={(e) => {
                      setAtemschutzAktiv(e.target.checked);
                      if (!e.target.checked) setAtemschutzminuten(0);
                      else if (atemschutzminuten === 0) setAtemschutzminuten(AGT_DEFAULT_MINUTEN);
                    }}
                  />{" "}
                  Atemschutz
                </label>
                <br />
                <br />

                {atemschutzAktiv && (
                  <>
                    <label htmlFor="db-atemschutz">
                      Atemschutzminuten: <strong>{atemschutzminuten}</strong>
                    </label>
                    <input
                      id="db-atemschutz"
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

                {fehler && <p className="fehlertext">{fehler}</p>}

                <button type="submit" disabled={laeuft}>
                  {laeuft ? "Wird gespeichert…" : "Eintragen"}
                </button>
              </div>
            </div>
          </form>

          <div className="karte">
            <h3 style={{ marginTop: 0 }}>Teilnehmer ({dienstbuch.teilnehmer.length})</h3>
            {dienstbuch.teilnehmer.length === 0 && <p style={{ color: "#999" }}>Noch niemand eingetragen.</p>}
            <ul className="dienstbuch-teilnehmer-liste">
              {dienstbuch.teilnehmer.map((t) => (
                <li key={t.id}>
                  <strong>{t.person_name}</strong>
                  {t.gruppe_name ? ` – ${t.gruppe_name}` : ""}
                  {t.atemschutzminuten ? ` · Atemschutz ${t.atemschutzminuten} min` : ""}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
