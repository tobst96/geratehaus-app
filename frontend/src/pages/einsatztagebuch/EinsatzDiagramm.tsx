import { useState, type FormEvent } from "react";
import { teilnahmeEintragen } from "../../api/einsaetze";
import { ApiError } from "../../api/client";
import type { TeilnahmeAnlegen } from "../../api/einsaetze";

interface EinsatzDiagrammProps {
  einsatzId: number;
  fahrzeuge: Array<{ id: number; name: string }>;
  funktionen: Array<{ id: number; name: string }>;
  onSuccess: () => void;
  onCancel: () => void;
}

interface ClickZone {
  x: number;
  y: number;
  fahrzeugNummer: string;
}

export function EinsatzDiagramm({
  einsatzId,
  fahrzeuge,
  funktionen,
  onSuccess,
  onCancel,
}: EinsatzDiagrammProps) {
  const [clickZones, setClickZones] = useState<ClickZone[]>([]);
  const [selectedZone, setSelectedZone] = useState<number | null>(null);
  const [barcode, setBarcode] = useState("");
  const [fahrzeugId, setFahrzeugId] = useState("");
  const [funktionId, setFunktionId] = useState("");
  const [vab, setVab] = useState(false);
  const [atemschutzminuten, setAtemschutzminuten] = useState(0);
  const [bemerkung, setBemerkung] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);

  function handleDiagramClick(e: React.MouseEvent<SVGSVGElement>) {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // Simple vehicle numbering (could be more sophisticated)
    const fahrzeugNummer = `${Math.floor(x / 25) + 1}-${Math.floor(y / 25) + 1}`;
    const newZone = { x, y, fahrzeugNummer };
    setClickZones([...clickZones, newZone]);
  }

  async function submitTeilnahme(e: FormEvent) {
    e.preventDefault();
    if (selectedZone === null || !barcode.trim()) {
      setFehler("Barcode erforderlich");
      return;
    }

    setLaeuft(true);
    setFehler(null);
    try {
      const daten: TeilnahmeAnlegen = {
        fahrzeug_id: fahrzeugId ? Number(fahrzeugId) : null,
        funktion_id: funktionId ? Number(funktionId) : null,
        vab,
        atemschutzminuten,
        nur_geraetehaus: false,
      };
      await teilnahmeEintragen(einsatzId, daten);

      // Mark zone as green (successful)
      const updatedZones = [...clickZones];
      updatedZones[selectedZone] = {
        ...updatedZones[selectedZone],
        fahrzeugNummer: `✓ ${updatedZones[selectedZone].fahrzeugNummer}`,
      };
      setClickZones(updatedZones);

      // Reset form
      setBarcode("");
      setFahrzeugId("");
      setFunktionId("");
      setVab(false);
      setAtemschutzminuten(0);
      setBemerkung("");
      setSelectedZone(null);

      // Auto-dismiss after 2 seconds
      setTimeout(() => {
        setClickZones(updatedZones.filter((_, i) => i !== selectedZone));
      }, 2000);
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Speichern fehlgeschlagen");
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <div style={{ padding: "1rem" }}>
      <h2>Fahrzeug-Skizze - Position auswählen</h2>
      <p style={{ color: "#666", fontSize: "0.9rem" }}>
        Klicke auf die Fahrzeug-Skizze, um deine Position zu markieren
      </p>

      <svg
        onClick={handleDiagramClick}
        style={{
          border: "2px solid #ccc",
          borderRadius: "8px",
          cursor: "crosshair",
          width: "100%",
          maxWidth: "500px",
          backgroundColor: "#f9f9f9",
          marginBottom: "1rem",
        }}
        viewBox="0 0 500 300"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Simple vehicle diagram */}
        <rect x="50" y="50" width="400" height="200" fill="none" stroke="#333" strokeWidth="2" />
        <rect x="70" y="70" width="80" height="60" fill="none" stroke="#666" strokeWidth="1" />
        <rect x="200" y="70" width="80" height="60" fill="none" stroke="#666" strokeWidth="1" />
        <rect x="330" y="70" width="80" height="60" fill="none" stroke="#666" strokeWidth="1" />
        <text x="250" y="285" textAnchor="middle" fontSize="12" fill="#666">
          Fahrzeug-Skizze
        </text>

        {/* Click zones */}
        {clickZones.map((zone, idx) => (
          <g key={idx}>
            <circle
              cx={(zone.x / 100) * 500}
              cy={(zone.y / 100) * 300}
              r="20"
              fill={idx === selectedZone ? "#ff9800" : "#4caf50"}
              opacity="0.7"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedZone(idx);
              }}
              style={{ cursor: "pointer" }}
            />
            <text
              x={(zone.x / 100) * 500}
              y={(zone.y / 100) * 300 + 6}
              textAnchor="middle"
              fontSize="10"
              fill="white"
              fontWeight="bold"
              pointerEvents="none"
            >
              {zone.fahrzeugNummer}
            </text>
          </g>
        ))}
      </svg>

      {selectedZone !== null && (
        <form onSubmit={submitTeilnahme} style={{ border: "2px solid #ff9800", padding: "1rem", borderRadius: "8px" }}>
          <h3>Position: {clickZones[selectedZone]?.fahrzeugNummer}</h3>

          <label htmlFor="barcode">Barcode einscannen</label>
          <input
            id="barcode"
            type="text"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            placeholder="Barcode oder Nummer"
            autoFocus
            required
          />
          <br />
          <br />

          <label htmlFor="fahrzeug">Fahrzeug (optional)</label>
          <select id="fahrzeug" value={fahrzeugId} onChange={(e) => setFahrzeugId(e.target.value)}>
            <option value="">–</option>
            {fahrzeuge.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <br />
          <br />

          <label htmlFor="funktion">Funktion (optional)</label>
          <select id="funktion" value={funktionId} onChange={(e) => setFunktionId(e.target.value)}>
            <option value="">–</option>
            {funktionen.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <br />
          <br />

          <label>
            <input type="checkbox" checked={vab} onChange={(e) => setVab(e.target.checked)} /> VAB
          </label>
          <br />
          <br />

          <label htmlFor="atemschutz">Atemschutzminuten</label>
          <input
            id="atemschutz"
            type="number"
            min={0}
            value={atemschutzminuten}
            onChange={(e) => setAtemschutzminuten(Number(e.target.value))}
          />
          <br />
          <br />

          <label htmlFor="bemerkung">Bemerkung (optional)</label>
          <textarea
            id="bemerkung"
            value={bemerkung}
            onChange={(e) => setBemerkung(e.target.value)}
            rows={2}
            placeholder="Notizen..."
          />
          <br />
          <br />

          {fehler && <p style={{ color: "red" }}>{fehler}</p>}

          <button type="submit" disabled={laeuft}>
            {laeuft ? "Wird gespeichert…" : "Speichern"}
          </button>{" "}
          <button type="button" className="sekundaer" onClick={() => setSelectedZone(null)}>
            Abbrechen
          </button>
        </form>
      )}

      <div style={{ marginTop: "1rem" }}>
        <button className="sekundaer" onClick={onCancel}>
          Zurück
        </button>
      </div>
    </div>
  );
}
