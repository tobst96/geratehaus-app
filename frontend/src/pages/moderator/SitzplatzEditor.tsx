import { useRef, useState } from "react";
import { fahrzeugAktualisieren } from "../../api/moderator";
import { ApiError } from "../../api/client";
import type { Fahrzeug, Sitzplatz } from "../../api/types";

interface PresetDefinition {
  label: string;
  sitzplaetze: Omit<Sitzplatz, "id">[];
}

// Standard-Besatzungen nach DIN 14502 / FwDV: Trupp (1+2), Staffel (1+5), Gruppe (1+8).
// Layout: Fahrer + Gruppenführer vorne, Rest in zwei Bankreihen dahinter.
const PRESETS: Record<string, PresetDefinition> = {
  trupp: {
    label: "Trupp (1+2)",
    sitzplaetze: [
      { bezeichnung: "Fahrer", x: 25, y: 20 },
      { bezeichnung: "Truppführer", x: 75, y: 20 },
      { bezeichnung: "Truppmann", x: 75, y: 70 },
    ],
  },
  staffel: {
    label: "Staffel (1+5)",
    sitzplaetze: [
      { bezeichnung: "Fahrer", x: 25, y: 15 },
      { bezeichnung: "Gruppenführer", x: 75, y: 15 },
      { bezeichnung: "Truppführer 1", x: 15, y: 55 },
      { bezeichnung: "Truppmann 1", x: 50, y: 55 },
      { bezeichnung: "Truppführer 2", x: 15, y: 85 },
      { bezeichnung: "Truppmann 2", x: 50, y: 85 },
    ],
  },
  gruppe: {
    label: "Gruppe (1+8)",
    sitzplaetze: [
      { bezeichnung: "Fahrer", x: 20, y: 12 },
      { bezeichnung: "Gruppenführer", x: 80, y: 12 },
      { bezeichnung: "Truppführer 1", x: 12, y: 45 },
      { bezeichnung: "Truppmann 1", x: 38, y: 45 },
      { bezeichnung: "Truppführer 2", x: 62, y: 45 },
      { bezeichnung: "Truppmann 2", x: 88, y: 45 },
      { bezeichnung: "Melder", x: 12, y: 80 },
      { bezeichnung: "Maschinist", x: 50, y: 80 },
      { bezeichnung: "Truppmann 3", x: 88, y: 80 },
    ],
  },
};

function neueSitzplatzId(): string {
  return `sitz-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

interface SitzplatzEditorProps {
  fahrzeug: Fahrzeug;
  onClose: () => void;
  onGespeichert: (fahrzeug: Fahrzeug) => void;
}

export function SitzplatzEditor({ fahrzeug, onClose, onGespeichert }: SitzplatzEditorProps) {
  const [sitzplaetze, setSitzplaetze] = useState<Sitzplatz[]>(fahrzeug.sitzplaetze ?? []);
  const [ausgewaehlt, setAusgewaehlt] = useState<string | null>(null);
  const [speichern, setSpeichern] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const ziehtRef = useRef<string | null>(null);

  function preisetAnwenden(key: string) {
    const preset = PRESETS[key];
    if (sitzplaetze.length > 0 && !window.confirm("Vorhandene Sitzplätze durch Vorlage ersetzen?")) {
      return;
    }
    setSitzplaetze(preset.sitzplaetze.map((s) => ({ ...s, id: neueSitzplatzId() })));
    setAusgewaehlt(null);
  }

  function boxKoordinaten(e: { clientX: number; clientY: number }): { x: number; y: number } {
    const rect = boxRef.current!.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100));
    return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
  }

  function boxKlick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target !== boxRef.current) return; // Klick kam von einem Sitzplatz, nicht vom freien Bereich
    const { x, y } = boxKoordinaten(e);
    const bezeichnung = window.prompt("Bezeichnung des neuen Sitzplatzes:", "Sitzplatz");
    if (!bezeichnung || !bezeichnung.trim()) return;
    const neu: Sitzplatz = { id: neueSitzplatzId(), bezeichnung: bezeichnung.trim(), x, y };
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
    const neuerName = window.prompt("Neue Bezeichnung:", aktuell.bezeichnung);
    if (!neuerName || !neuerName.trim()) return;
    setSitzplaetze((vorher) => vorher.map((s) => (s.id === id ? { ...s, bezeichnung: neuerName.trim() } : s)));
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
      setFehler(err instanceof ApiError ? String(err.detail) : "Speichern fehlgeschlagen.");
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
        <h2>Sitzplätze: {fahrzeug.name}</h2>
        <p style={{ fontSize: "0.85rem", color: "#666" }}>
          Vorlage wählen, dann Sitzplätze per Ziehen positionieren. Klick auf freie Fläche fügt einen
          neuen Sitzplatz hinzu, Klick auf einen Sitzplatz erlaubt Umbenennen/Löschen.
        </p>

        <div style={{ display: "flex", gap: 8, marginBottom: "1rem", flexWrap: "wrap" }}>
          {Object.entries(PRESETS).map(([key, preset]) => (
            <button key={key} type="button" className="sekundaer" onClick={() => preisetAnwenden(key)}>
              {preset.label}
            </button>
          ))}
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
            background: "#f0f0f0",
            border: "2px solid #ccc",
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
          <div style={{ marginTop: "1rem", display: "flex", gap: 8 }}>
            <button type="button" className="sekundaer" onClick={() => umbenennen(ausgewaehlt)}>
              Umbenennen
            </button>
            <button type="button" className="sekundaer" onClick={() => entfernen(ausgewaehlt)}>
              Löschen
            </button>
          </div>
        )}

        {fehler && <p className="fehlertext">{fehler}</p>}

        <div style={{ marginTop: "1.5rem", display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" className="sekundaer" onClick={onClose}>
            Abbrechen
          </button>
          <button type="button" onClick={speichernKlick} disabled={speichern}>
            {speichern ? "Speichert …" : "Speichern"}
          </button>
        </div>
      </div>
    </div>
  );
}
