import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { holeEinstellungen, schreibeEinstellungen } from "../../../api/moderator";
import { ApiError } from "../../../api/client";
import { Personal } from "../Personal";

export function PersonalModul() {
  const [geladen, setGeladen] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [gespeichert, setGespeichert] = useState(false);
  const [speichert, setSpeichert] = useState(false);

  const [gelbTage, setGelbTage] = useState(30);
  const [rotTage, setRotTage] = useState(60);
  const [meldeGelb, setMeldeGelb] = useState(true);
  const [meldeRot, setMeldeRot] = useState(true);

  useEffect(() => {
    holeEinstellungen()
      .then((w) => {
        setGelbTage(Number(w.personal_ampel_gelb_tage ?? 30));
        setRotTage(Number(w.personal_ampel_rot_tage ?? 60));
        setMeldeGelb(w.benachrichtigung_person_ampel_gelb !== false);
        setMeldeRot(w.benachrichtigung_person_ampel_rot !== false);
        setGeladen(true);
      })
      .catch(() => setGeladen(true));
  }, []);

  async function speichern() {
    setSpeichert(true);
    setFehler(null);
    setGespeichert(false);
    try {
      await schreibeEinstellungen({
        personal_ampel_gelb_tage: gelbTage,
        personal_ampel_rot_tage: rotTage,
        benachrichtigung_person_ampel_gelb: meldeGelb,
        benachrichtigung_person_ampel_rot: meldeRot,
      });
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

      <div className="karte">
        <h2>Aktivitäts-Ampel</h2>
        <p style={{ color: "var(--farbe-text-mute)", marginTop: 0 }}>
          Färbt Personen ein, die seit einer bestimmten Anzahl Tagen keinen Einsatz,
          Dienst oder keine Dienststunden mehr hatten (nur aktive Module zählen).
          0 Tage = diese Farbe aus. Als inaktiv markierte Personen sind ausgenommen.
        </p>
        <div className="formular-feld">
          <label htmlFor="ampel-gelb">Gelb ab (Tagen ohne Eintrag)</label>
          <input
            id="ampel-gelb"
            type="number"
            min={0}
            value={gelbTage}
            onChange={(e) => setGelbTage(Number(e.target.value))}
          />
        </div>
        <div className="formular-feld">
          <label htmlFor="ampel-rot">Rot ab (Tagen ohne Eintrag)</label>
          <input
            id="ampel-rot"
            type="number"
            min={0}
            value={rotTage}
            onChange={(e) => setRotTage(Number(e.target.value))}
          />
        </div>

        <h3 style={{ marginBottom: 4 }}>Benachrichtigungen</h3>
        <p style={{ color: "var(--farbe-text-mute)", marginTop: 0 }}>
          Gehen einmalig beim Überschreiten der Schwelle an die Personen, die das
          jeweilige Ereignis abonniert haben (Benachrichtigungskanäle je Person).
        </p>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="checkbox" checked={meldeGelb} onChange={(e) => setMeldeGelb(e.target.checked)} />
          Bei gelber Ampel benachrichtigen
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="checkbox" checked={meldeRot} onChange={(e) => setMeldeRot(e.target.checked)} />
          Bei roter Ampel benachrichtigen
        </label>

        <div style={{ marginTop: 12 }}>
          <button onClick={speichern} disabled={speichert || !geladen}>
            {speichert ? "Speichert …" : "Speichern"}
          </button>
          {gespeichert && (
            <span style={{ marginLeft: 10, color: "var(--farbe-text-mute)" }}>✓ gespeichert</span>
          )}
        </div>
        {fehler && <p className="fehlertext">{fehler}</p>}
      </div>

      <Personal />
    </div>
  );
}
