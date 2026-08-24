import { Fehlertext } from "../../components/Fehlertext";
import { useRef, useState } from "react";
import { fahrzeugAktualisieren } from "../../api/gruppenfuehrer";
import { ApiError } from "../../api/client";
import type { Fahrzeug, FunktionEinsatz, Sitzplatz } from "../../api/types";
import { texte } from "../../i18n/texte";

const t = texte.sitzplatz_editor;

interface PresetDefinition {
  label: string;
  sitzplaetze: Omit<Sitzplatz, "id" | "funktion_id">[];
}

// Standard-Besatzungen nach FwDV 3 / DIN 14502. Positionen sind schematisch
// (x/y in %); Reihenfolge/Benennung nach deutscher Sitzordnung. „(PA)" markiert
// Sitze mit Pressluftatmer im Rückenlehnenhalter.
const PRESETS: Record<string, PresetDefinition> = {
  trupp: {
    // Alle in einer Reihe, Truppmann mittig.
    label: t.preset_labels.trupp,
    sitzplaetze: [
      { bezeichnung: "Fahrer", x: 22, y: 50 },
      { bezeichnung: "Truppmann", x: 50, y: 50 },
      { bezeichnung: "Truppführer", x: 78, y: 50 },
    ],
  },
  staffel: {
    label: t.preset_labels.staffel,
    sitzplaetze: [
      { bezeichnung: "Maschinist", x: 30, y: 15 },
      { bezeichnung: "Gruppenführer", x: 70, y: 15 },
      { bezeichnung: "Angriffstruppführer", x: 30, y: 55 },
      { bezeichnung: "Angriffstruppmann", x: 70, y: 55 },
      { bezeichnung: "Wassertruppführer", x: 30, y: 85 },
      { bezeichnung: "Wassertruppmann", x: 70, y: 85 },
    ],
  },
  gruppe_2pa: {
    label: t.preset_labels.gruppe_2pa,
    // Wie 4 PA, nur Wasser- und Schlauchtrupp in der hinteren Reihe getauscht.
    sitzplaetze: [
      { bezeichnung: "Maschinist", x: 30, y: 12 },
      { bezeichnung: "Gruppenführer", x: 70, y: 12 },
      { bezeichnung: "Angriffstruppführer", x: 20, y: 45 },
      { bezeichnung: "Melder", x: 50, y: 45 },
      { bezeichnung: "Angriffstruppmann", x: 80, y: 45 },
      { bezeichnung: "Wassertruppführer", x: 14, y: 82 },
      { bezeichnung: "Schlauchtruppführer", x: 38, y: 82 },
      { bezeichnung: "Schlauchtruppmann", x: 62, y: 82 },
      { bezeichnung: "Wassertruppmann", x: 86, y: 82 },
    ],
  },
  gruppe_4pa: {
    label: t.preset_labels.gruppe_4pa,
    sitzplaetze: [
      { bezeichnung: "Maschinist", x: 30, y: 12 },
      { bezeichnung: "Gruppenführer", x: 70, y: 12 },
      { bezeichnung: "Angriffstruppführer", x: 20, y: 45 },
      { bezeichnung: "Melder", x: 50, y: 45 },
      { bezeichnung: "Angriffstruppmann", x: 80, y: 45 },
      { bezeichnung: "Schlauchtruppführer", x: 14, y: 82 },
      { bezeichnung: "Wassertruppführer", x: 38, y: 82 },
      { bezeichnung: "Wassertruppmann", x: 62, y: 82 },
      { bezeichnung: "Schlauchtruppmann", x: 86, y: 82 },
    ],
  },
};

function neueSitzplatzId(): string {
  return `sitz-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

// Rasterweite in Prozent der Box - reicht für ein sauber wirkendes Layout, ohne
// beim Andocken an Presets (die krumme Prozentwerte nutzen) sofort zu verschieben.
const RASTER_SCHRITT = 5;

function anRasterAusrichten(wert: number): number {
  return Math.round(wert / RASTER_SCHRITT) * RASTER_SCHRITT;
}

interface SitzplatzEditorProps {
  fahrzeug: Fahrzeug;
  funktionen: FunktionEinsatz[];
  onClose: () => void;
  onGespeichert: (fahrzeug: Fahrzeug) => void;
}

export function SitzplatzEditor({ fahrzeug, funktionen, onClose, onGespeichert }: SitzplatzEditorProps) {
  const [sitzplaetze, setSitzplaetze] = useState<Sitzplatz[]>(fahrzeug.sitzplaetze ?? []);
  const [ausgewaehlt, setAusgewaehlt] = useState<string | null>(null);
  const [rasterAktiv, setRasterAktiv] = useState(false);
  const [speichern, setSpeichern] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const ziehtRef = useRef<string | null>(null);

  function preisetAnwenden(key: string) {
    const preset = PRESETS[key];
    if (sitzplaetze.length > 0 && !window.confirm(t.vorlage_ersetzen_bestaetigen)) {
      return;
    }
    setSitzplaetze(preset.sitzplaetze.map((s) => ({ ...s, id: neueSitzplatzId(), funktion_id: null })));
    setAusgewaehlt(null);
  }

  function boxKoordinaten(e: { clientX: number; clientY: number }): { x: number; y: number } {
    const rect = boxRef.current!.getBoundingClientRect();
    let x = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
    let y = Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100));
    if (rasterAktiv) {
      x = Math.min(100, Math.max(0, anRasterAusrichten(x)));
      y = Math.min(100, Math.max(0, anRasterAusrichten(y)));
    }
    return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
  }

  function boxKlick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target !== boxRef.current) return; // Klick kam von einem Sitzplatz, nicht vom freien Bereich
    const { x, y } = boxKoordinaten(e);
    const bezeichnung = window.prompt(t.neuer_sitzplatz_prompt, t.neuer_sitzplatz_default);
    if (!bezeichnung || !bezeichnung.trim()) return;
    const neu: Sitzplatz = { id: neueSitzplatzId(), bezeichnung: bezeichnung.trim(), x, y, funktion_id: null };
    setSitzplaetze((vorher) => [...vorher, neu]);
    setAusgewaehlt(neu.id);
  }

  function sitzplatzPointerDown(e: React.PointerEvent, id: string) {
    e.stopPropagation();
    setAusgewaehlt(id);
    ziehtRef.current = id;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function sitzplatzPointerMove(e: React.PointerEvent) {
    const ziehtId = ziehtRef.current;
    if (!ziehtId || !boxRef.current) return;
    const { x, y } = boxKoordinaten(e);
    setSitzplaetze((vorher) => vorher.map((s) => (s.id === ziehtId ? { ...s, x, y } : s)));
  }

  function sitzplatzPointerUp() {
    ziehtRef.current = null;
  }

  function umbenennen(id: string) {
    const aktuell = sitzplaetze.find((s) => s.id === id);
    if (!aktuell) return;
    const neuerName = window.prompt(t.umbenennen_prompt, aktuell.bezeichnung);
    if (!neuerName || !neuerName.trim()) return;
    setSitzplaetze((vorher) => vorher.map((s) => (s.id === id ? { ...s, bezeichnung: neuerName.trim() } : s)));
  }

  function funktionAendern(id: string, funktionId: number | null) {
    setSitzplaetze((vorher) => vorher.map((s) => (s.id === id ? { ...s, funktion_id: funktionId } : s)));
  }

  function entfernen(id: string) {
    setSitzplaetze((vorher) => vorher.filter((s) => s.id !== id));
    setAusgewaehlt(null);
  }

  async function speichernKlick() {
    setSpeichern(true);
    setFehler(null);
    try {
      const aktualisiert = await fahrzeugAktualisieren(fahrzeug.id, { sitzplaetze });
      onGespeichert(aktualisiert);
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : t.fehler_speichern);
    } finally {
      setSpeichern(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "1rem",
      }}
      onClick={onClose}
    >
      <div
        className="karte"
        style={{ maxWidth: 720, width: "100%", maxHeight: "90vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2>{t.titel_prefix} {fahrzeug.name}</h2>
        <p className="hinweistext">{t.hinweis}</p>

        <div style={{ display: "flex", gap: 8, marginBottom: "1rem", flexWrap: "wrap", alignItems: "center" }}>
          {Object.entries(PRESETS).map(([key, preset]) => (
            <button key={key} type="button" className="sekundaer" onClick={() => preisetAnwenden(key)}>
              {preset.label}
            </button>
          ))}
          <label style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: "auto" }}>
            <input
              type="checkbox"
              checked={rasterAktiv}
              onChange={(e) => setRasterAktiv(e.target.checked)}
            />
            {t.raster_label}
          </label>
        </div>

        <div
          ref={boxRef}
          onClick={boxKlick}
          onPointerMove={sitzplatzPointerMove}
          onPointerUp={sitzplatzPointerUp}
          style={{
            position: "relative",
            width: "100%",
            aspectRatio: "16 / 10",
            background: rasterAktiv
              ? `var(--farbe-oberflaeche-hover)
                 repeating-linear-gradient(
                   to right, var(--farbe-rand) 0, var(--farbe-rand) 1px,
                   transparent 1px, transparent ${RASTER_SCHRITT}%
                 )
                 repeating-linear-gradient(
                   to bottom, var(--farbe-rand) 0, var(--farbe-rand) 1px,
                   transparent 1px, transparent ${RASTER_SCHRITT}%
                 )`
              : "var(--farbe-oberflaeche-hover)",
            border: "2px solid var(--farbe-rand)",
            borderRadius: "var(--radius)",
            cursor: "copy",
            touchAction: "none",
          }}
        >
          {sitzplaetze.map((s) => (
            <div
              key={s.id}
              onPointerDown={(e) => sitzplatzPointerDown(e, s.id)}
              onClick={(e) => {
                e.stopPropagation();
                setAusgewaehlt(s.id);
              }}
              style={{
                position: "absolute",
                left: `${s.x}%`,
                top: `${s.y}%`,
                transform: "translate(-50%, -50%)",
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: ausgewaehlt === s.id ? "var(--farbe-primaer)" : "#fff",
                border: "2px solid var(--farbe-primaer)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.7rem",
                fontWeight: 600,
                textAlign: "center",
                padding: 4,
                cursor: "grab",
                userSelect: "none",
                boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
              }}
              title={s.bezeichnung}
            >
              {s.bezeichnung}
            </div>
          ))}
        </div>

        {ausgewaehlt && (
          <div style={{ marginTop: "1rem", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button type="button" className="sekundaer" onClick={() => umbenennen(ausgewaehlt)}>
              {t.umbenennen}
            </button>
            <button type="button" className="sekundaer" onClick={() => entfernen(ausgewaehlt)}>
              {t.loeschen}
            </button>
            <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {t.funktion_label}
              <select
                value={sitzplaetze.find((s) => s.id === ausgewaehlt)?.funktion_id ?? ""}
                onChange={(e) =>
                  funktionAendern(ausgewaehlt, e.target.value ? Number(e.target.value) : null)
                }
              >
                <option value="">{t.funktion_keine}</option>
                {funktionen.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        {fehler && <Fehlertext>{fehler}</Fehlertext>}

        <div style={{ marginTop: "1.5rem", display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" className="sekundaer" onClick={onClose}>
            {t.abbrechen}
          </button>
          <button type="button" onClick={speichernKlick} disabled={speichern}>
            {speichern ? t.speichert : t.speichern}
          </button>
        </div>
      </div>
    </div>
  );
}
