import { Fehlertext } from "../../../components/Fehlertext";
import { useEffect, useState } from "react";
import { Gespeichert } from "../../../components/Gespeichert";
import { Link } from "react-router-dom";
import { holeEinstellungen, schreibeEinstellungen } from "../../../api/moderator";
import { ApiError } from "../../../api/client";
import { Ladeanzeige } from "../../../components/Ladeanzeige";
import { FunktionenEinsatzVerwaltung } from "../verwaltung/FunktionenEinsatzVerwaltung";
import { EinsatzFelderVerwaltung } from "../verwaltung/EinsatzFelderVerwaltung";

export function EinsatztagebuchModul() {
  const [geladen, setGeladen] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [gespeichert, setGespeichert] = useState(false);
  const [speichert, setSpeichert] = useState(false);

  const [countdown, setCountdown] = useState(30);
  const [alleEingetragen, setAlleEingetragen] = useState(30);
  const [autoabschlussStunde, setAutoabschlussStunde] = useState(4);
  const [autoabschlussInaktivitaet, setAutoabschlussInaktivitaet] = useState(4);
  const [statistikOffset, setStatistikOffset] = useState(0);
  const [statistikOffsetJahr, setStatistikOffsetJahr] = useState(0);

  useEffect(() => {
    holeEinstellungen()
      .then((w) => {
        setCountdown(Number(w.einsatz_countdown_minuten ?? 30));
        setAlleEingetragen(Number(w.einsatz_alle_eingetragen_minuten ?? 30));
        setAutoabschlussStunde(Number(w.einsatz_autoabschluss_stunde ?? 4));
        setAutoabschlussInaktivitaet(Number(w.einsatz_autoabschluss_inaktivitaet_stunden ?? 4));
        setStatistikOffset(Number(w.einsatz_statistik_offset ?? 0));
        setStatistikOffsetJahr(Number(w.einsatz_statistik_offset_jahr ?? 0));
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
        einsatz_countdown_minuten: countdown,
        einsatz_alle_eingetragen_minuten: alleEingetragen,
        einsatz_autoabschluss_stunde: autoabschlussStunde,
        einsatz_autoabschluss_inaktivitaet_stunden: autoabschlussInaktivitaet,
        einsatz_statistik_offset: statistikOffset,
        einsatz_statistik_offset_jahr: statistikOffsetJahr,
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
      <h1>Einsatztagebuch</h1>

      <div className="karte">
        <h2>Ablauf &amp; Abschluss</h2>
        <div className="formular-feld">
          <label htmlFor="et-countdown">Einsatz-Countdown im Gerätehaus (Minuten)</label>
          <input
            id="et-countdown"
            type="number"
            min={1}
            value={countdown}
            onChange={(e) => setCountdown(Number(e.target.value))}
          />
        </div>
        <div className="formular-feld">
          <label htmlFor="et-alle">
            Verzögerung nach „Alle eingetragen" bis zum automatischen Abschluss (Minuten)
          </label>
          <input
            id="et-alle"
            type="number"
            min={1}
            value={alleEingetragen}
            onChange={(e) => setAlleEingetragen(Number(e.target.value))}
          />
        </div>
        <div className="formular-feld">
          <label htmlFor="et-abschluss-stunde">Automatischer Einsatzabschluss um (Uhrzeit, Stunde 0–23)</label>
          <input
            id="et-abschluss-stunde"
            type="number"
            min={0}
            max={23}
            value={autoabschlussStunde}
            onChange={(e) => setAutoabschlussStunde(Number(e.target.value))}
          />
        </div>
        <div className="formular-feld">
          <label htmlFor="et-abschluss-inaktiv">
            Offene Einsätze automatisch schließen nach Inaktivität (Stunden)
          </label>
          <input
            id="et-abschluss-inaktiv"
            type="number"
            min={1}
            value={autoabschlussInaktivitaet}
            onChange={(e) => setAutoabschlussInaktivitaet(Number(e.target.value))}
          />
        </div>
        <button onClick={speichern} disabled={speichert}>
          {speichert ? "Speichert …" : "Speichern"}
        </button>
        {gespeichert && <Gespeichert />}
        {fehler && <Fehlertext>{fehler}</Fehlertext>}
      </div>

      <div className="karte" style={{ marginTop: 16 }}>
        <h2>Jahresstatistik</h2>
        <p className="hinweistext">
          Im Einsatztagebuch wird die Zahl der Einsätze des laufenden Jahres mit dem Vorjahr zum
          selben Stichtag verglichen. Wurde die App mitten im Jahr eingeführt, kann hier ein
          Startwert (bereits abgearbeitete Einsätze) für ein Jahr hinterlegt werden – er fließt in
          die Zählung ein. Jahr 0 = kein Startwert.
        </p>
        <div className="formular-feld">
          <label htmlFor="et-stat-offset">Startwert (bereits abgearbeitete Einsätze)</label>
          <input
            id="et-stat-offset"
            type="number"
            min={0}
            value={statistikOffset}
            onChange={(e) => setStatistikOffset(Number(e.target.value))}
          />
        </div>
        <div className="formular-feld">
          <label htmlFor="et-stat-jahr">Startwert gilt für Jahr (z. B. {new Date().getFullYear()})</label>
          <input
            id="et-stat-jahr"
            type="number"
            min={0}
            value={statistikOffsetJahr}
            onChange={(e) => setStatistikOffsetJahr(Number(e.target.value))}
          />
        </div>
        <button onClick={speichern} disabled={speichert}>
          {speichert ? "Speichert …" : "Speichern"}
        </button>
        {gespeichert && <Gespeichert />}
      </div>

      <div className="karte" style={{ marginTop: 16 }}>
        <h2>Einsatz-Funktionen</h2>
        <FunktionenEinsatzVerwaltung />
      </div>

      <div className="karte" style={{ marginTop: 16 }}>
        <h2>Zusatzfelder</h2>
        <EinsatzFelderVerwaltung />
      </div>
    </div>
  );
}
