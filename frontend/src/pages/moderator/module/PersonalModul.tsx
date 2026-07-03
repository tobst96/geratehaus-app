import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Personal } from "../Personal";
import { GruppenVerwaltung } from "../verwaltung/GruppenVerwaltung";
import { holeEinstellungen, schreibeEinstellungen } from "../../../api/moderator";
import { ApiError } from "../../../api/client";

export function PersonalModul() {
  const [intervall, setIntervall] = useState(7);
  const [geladen, setGeladen] = useState(false);
  const [speichert, setSpeichert] = useState(false);
  const [gespeichert, setGespeichert] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  useEffect(() => {
    holeEinstellungen()
      .then((w) => {
        setIntervall(Number(w.pin_erinnerung_intervall_tage ?? 7));
        setGeladen(true);
      })
      .catch(() => setGeladen(true));
  }, []);

  async function speichern() {
    setSpeichert(true);
    setFehler(null);
    setGespeichert(false);
    try {
      await schreibeEinstellungen({ pin_erinnerung_intervall_tage: intervall });
      setGespeichert(true);
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Speichern fehlgeschlagen.");
    } finally {
      setSpeichert(false);
    }
  }

  return (
    <div>
      <p>
        <Link to="/moderator/module">← Zurück zu den Modulen</Link>
      </p>

      <Personal />

      <div className="karte" style={{ marginTop: 24 }}>
        <h2>Gruppen</h2>
        <p style={{ color: "var(--farbe-text-mute)" }}>
          Personengruppen (z. B. Züge/Gruppen), die Personen zugeordnet werden können.
        </p>
        <GruppenVerwaltung />
      </div>

      <div className="karte" style={{ marginTop: 24, maxWidth: 640 }}>
        <h2>PIN-Erinnerung</h2>
        <p style={{ color: "var(--farbe-text-mute)" }}>
          Ist das Barcode-Modul deaktiviert, melden sich Personen per Namen und PIN an. Personen ohne
          gesetzten PIN (mit hinterlegter E-Mail) werden in diesem Intervall automatisch per Mail an das
          Setzen ihres PINs erinnert.
        </p>
        <div className="formular-feld">
          <label htmlFor="pin-intervall">Erinnerungsintervall (Tage)</label>
          <input
            id="pin-intervall"
            type="number"
            min={1}
            value={intervall}
            onChange={(e) => setIntervall(Number(e.target.value))}
            disabled={!geladen}
          />
        </div>
        <button onClick={speichern} disabled={speichert || !geladen}>
          {speichert ? "Speichert …" : "Speichern"}
        </button>
        {gespeichert && <span style={{ marginLeft: 10, color: "var(--farbe-text-mute)" }}>✓ gespeichert</span>}
        {fehler && <p className="fehlertext">{fehler}</p>}
      </div>
    </div>
  );
}
