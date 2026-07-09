import { Fehlertext } from "../../../components/Fehlertext";
import { useEffect, useState } from "react";
import { Gespeichert } from "../../../components/Gespeichert";
import { Link } from "react-router-dom";
import { holeEinstellungen, schreibeEinstellungen } from "../../../api/moderator";
import { ApiError } from "../../../api/client";
import { Ladeanzeige } from "../../../components/Ladeanzeige";
import { DienstbuchFelderVerwaltung } from "../verwaltung/DienstbuchFelderVerwaltung";

export function DienstbuchModul() {
  const [geladen, setGeladen] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [gespeichert, setGespeichert] = useState(false);
  const [speichert, setSpeichert] = useState(false);

  const [zeitfenster, setZeitfenster] = useState(12);
  const [autoschlussStunde, setAutoschlussStunde] = useState(4);

  useEffect(() => {
    holeEinstellungen()
      .then((w) => {
        setZeitfenster(Number(w.dienstbuch_zeitfenster_stunden ?? 12));
        setAutoschlussStunde(Number(w.dienstbuch_autoschluss_stunde ?? 4));
        setGeladen(true);
      })
      .catch((err) =>
        setFehler(err instanceof ApiError ? String(err.detail) : "Einstellungen konnten nicht geladen werden.")
      );
  }, []);

  async function speichern() {
    setSpeichert(true);
    setFehler(null);
    setGespeichert(false);
    try {
      await schreibeEinstellungen({
        dienstbuch_zeitfenster_stunden: zeitfenster,
        dienstbuch_autoschluss_stunde: autoschlussStunde,
      });
      setGespeichert(true);
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Speichern fehlgeschlagen.");
    } finally {
      setSpeichert(false);
    }
  }

  if (fehler && !geladen) return <Fehlertext>{fehler}</Fehlertext>;
  if (!geladen) return <Ladeanzeige />;

  return (
    <div>
      <p>
        <Link to="/gruppenfuehrer/module">← Zurück zu den Modulen</Link>
      </p>
      <h1>Dienstbuch</h1>

      <div className="karte">
        <h2>Zeitfenster &amp; Abschluss</h2>
        <div className="formular-feld">
          <label htmlFor="db-zeitfenster">Dienstbuch-Zeitfenster (Stunden)</label>
          <input
            id="db-zeitfenster"
            type="number"
            min={1}
            value={zeitfenster}
            onChange={(e) => setZeitfenster(Number(e.target.value))}
          />
        </div>
        <div className="formular-feld">
          <label htmlFor="db-autoschluss">
            Offene Dienstbücher automatisch schließen um (Uhrzeit, Stunde 0–23)
          </label>
          <input
            id="db-autoschluss"
            type="number"
            min={0}
            max={23}
            value={autoschlussStunde}
            onChange={(e) => setAutoschlussStunde(Number(e.target.value))}
          />
        </div>
        <button onClick={speichern} disabled={speichert}>
          {speichert ? "Speichert …" : "Speichern"}
        </button>
        {gespeichert && <Gespeichert />}
        {fehler && <Fehlertext>{fehler}</Fehlertext>}
      </div>

      <div className="karte">
        <h2>Zusatzfelder</h2>
        <DienstbuchFelderVerwaltung />
      </div>
    </div>
  );
}
