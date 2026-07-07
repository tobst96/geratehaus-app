import { useEffect, useState } from "react";
import { Gespeichert } from "../../../components/Gespeichert";
import { Link } from "react-router-dom";
import { holeEinstellungen, schreibeEinstellungen } from "../../../api/moderator";
import { ApiError } from "../../../api/client";
import { Ladeanzeige } from "../../../components/Ladeanzeige";

export function FahrzeugbuchungModul() {
  const [geladen, setGeladen] = useState(false);
  const [icalUrls, setIcalUrls] = useState("");
  const [speichert, setSpeichert] = useState(false);
  const [gespeichert, setGespeichert] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  useEffect(() => {
    holeEinstellungen()
      .then((w) => {
        setIcalUrls(String(w.fahrzeugbuchung_ical_urls ?? ""));
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
      await schreibeEinstellungen({ fahrzeugbuchung_ical_urls: icalUrls });
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
      <h1>Fahrzeugbuchung</h1>

      <div className="karte">
        <h2>Fahrzeuge</h2>
        <p style={{ color: "var(--farbe-text-mute)" }}>
          Welche Fahrzeuge buchbar sind, wird im Modul{" "}
          <Link to="/moderator/module/fahrzeuge">Fahrzeuge</Link> festgelegt (Schalter „buchbar").
          Eingehende Buchungsanfragen werden unter{" "}
          <Link to="/moderator/buchungen">Buchungen</Link> freigegeben.
        </p>
      </div>

      <div className="karte" style={{ marginTop: 16 }}>
        <h2>Externe Kalender (iCal)</h2>
        <p className="hinweistext">
          Öffentliche iCal-/webcal-URLs (eine pro Zeile), z. B. ein geteilter Kalender oder ein
          Divera-Kalender. Deren Termine werden im Buchungskalender als nicht buchbare Fremdtermine
          angezeigt und bei der Konfliktprüfung berücksichtigt (Buchungen bleiben möglich, werden
          aber als Konflikt markiert).
        </p>
        {!geladen ? (
          <Ladeanzeige />
        ) : (
          <>
            <div className="formular-feld">
              <label htmlFor="fb-ical">iCal-URLs (eine pro Zeile)</label>
              <textarea
                id="fb-ical"
                rows={4}
                value={icalUrls}
                onChange={(e) => setIcalUrls(e.target.value)}
                placeholder="https://example.org/kalender.ics"
              />
            </div>
            <button onClick={speichern} disabled={speichert}>
              {speichert ? "Speichert …" : "Speichern"}
            </button>
            {gespeichert && <Gespeichert />}
          </>
        )}
        {fehler && <p className="fehlertext">{fehler}</p>}
      </div>
    </div>
  );
}
