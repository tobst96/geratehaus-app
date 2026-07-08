import { Fehlertext } from "../components/Fehlertext";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { holeStempelInfo, type DienststundenStempelInfo } from "../api/dienststundenStempel";
import { stundenErfassen } from "../api/dienststunden";
import { ApiError } from "../api/client";
import { Ladeanzeige } from "../components/Ladeanzeige";
import {
  PersonIdentifikation,
  type PersonIdentifikationHandle,
} from "../components/PersonIdentifikation";
import "./dienststunden/Dienststunden.css";

const SCHNELLAUSWAHL_STUNDEN = [0.25, 0.5, 1, 1.5, 2, 3, 4];
const STEPPER_SCHRITT = 0.25;
const STEPPER_MIN = 0.25;
const STEPPER_MAX = 12;

function stundenAnzeige(stunden: number): string {
  const gesamtMinuten = Math.round(stunden * 60);
  const std = Math.floor(gesamtMinuten / 60);
  const min = gesamtMinuten % 60;
  if (std === 0) return `${min} Min.`;
  if (min === 0) return `${std} Std.`;
  return `${std} Std. ${min} Min.`;
}

function heuteAlsDatum(): string {
  return new Date().toISOString().slice(0, 10);
}

export function DienststundenStempel() {
  const { funktionId } = useParams<{ funktionId: string }>();
  const identRef = useRef<PersonIdentifikationHandle>(null);
  const [info, setInfo] = useState<DienststundenStempelInfo | null>(null);
  const [ladeFehler, setLadeFehler] = useState<string | null>(null);
  const [stunden, setStunden] = useState<number>(1);
  const [fehler, setFehler] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);
  const [erfolg, setErfolg] = useState<{ name: string; stundenText: string } | null>(null);

  useEffect(() => {
    if (!funktionId) return;
    holeStempelInfo(Number(funktionId))
      .then(setInfo)
      .catch((err) =>
        setLadeFehler(err instanceof ApiError ? String(err.detail) : "Funktion konnte nicht geladen werden.")
      );
  }, [funktionId]);

  async function eintragen() {
    if (!info) return;
    setLaeuft(true);
    setFehler(null);
    try {
      const name = await identRef.current!.identifiziere();
      await stundenErfassen(info.funktion_id, stunden, heuteAlsDatum());
      setErfolg({ name, stundenText: stundenAnzeige(stunden) });
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Eintragung fehlgeschlagen.");
    } finally {
      setLaeuft(false);
    }
  }

  if (ladeFehler) {
    return (
      <div className="seite">
        <div className="karte">
          <Fehlertext>{ladeFehler}</Fehlertext>
        </div>
      </div>
    );
  }
  if (!info) {
    return (
      <div className="seite">
        <Ladeanzeige />
      </div>
    );
  }

  if (erfolg) {
    return (
      <div className="seite">
        <div className="karte">
          <h1>Eingetragen!</h1>
          <p>
            <strong>{erfolg.stundenText}</strong> für <strong>{info.funktion_name}</strong> am{" "}
            {heuteAlsDatum().split("-").reverse().join(".")} eingetragen. Du kannst diese Seite jetzt
            schließen.
          </p>
        </div>
      </div>
    );
  }

  if (!info.aktiv) {
    return (
      <div className="seite">
        <div className="karte">
          <h1>{info.funktion_name}</h1>
          <Fehlertext>
            Für diese Funktion ist die Dienststunden-Eintragung aktuell nicht möglich (Funktion oder
            Modul deaktiviert).
          </Fehlertext>
        </div>
      </div>
    );
  }

  return (
    <div className="seite">
      <div className="karte">
        <h1>Dienststunden eintragen</h1>
        <p className="text-mute">
          Funktion: <strong>{info.funktion_name}</strong> · Datum: heute (
          {heuteAlsDatum().split("-").reverse().join(".")})
        </p>

        <div className="formular-feld">
          <label>Stunden</label>
          <div className="stunden-chips">
            {SCHNELLAUSWAHL_STUNDEN.map((w) => (
              <button
                key={w}
                type="button"
                className={`stunden-chip${stunden === w ? " aktiv" : ""}`}
                onClick={() => setStunden(w)}
              >
                {stundenAnzeige(w)}
              </button>
            ))}
          </div>
          <div className="stunden-stepper">
            <button
              type="button"
              className="stunden-stepper-btn"
              onClick={() => setStunden((v) => Math.max(STEPPER_MIN, Math.round((v - STEPPER_SCHRITT) * 4) / 4))}
              disabled={stunden <= STEPPER_MIN}
            >
              −
            </button>
            <span className="stunden-anzeige">{stundenAnzeige(stunden)}</span>
            <button
              type="button"
              className="stunden-stepper-btn"
              onClick={() => setStunden((v) => Math.min(STEPPER_MAX, Math.round((v + STEPPER_SCHRITT) * 4) / 4))}
              disabled={stunden >= STEPPER_MAX}
            >
              +
            </button>
          </div>
        </div>

        <div className="formular-feld">
          <label>Anmelden</label>
          <PersonIdentifikation ref={identRef} autoFocus />
        </div>

        {fehler && <Fehlertext>{fehler}</Fehlertext>}

        <button type="button" onClick={eintragen} disabled={laeuft}>
          {laeuft ? "Wird gespeichert…" : "Eintragen"}
        </button>
      </div>
    </div>
  );
}
