import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import {
  dienststundenReservierungEinloesen,
  dienststundenReservierungVorschauSetzen,
  holeDienststundenReservierung,
  holeDienststundenReservierungPersonen,
} from "../api/dienststundenReservierungen";
import { holeFunktionenDienststunden } from "../api/stammdaten";
import { ApiError } from "../api/client";
import { eintragungGesperrtMinuten, eintragungVermerken } from "../utils/eintragungssperre";
import { Ladeanzeige } from "../components/Ladeanzeige";
import type { DienststundenReservierungInfo, FunktionDienststunden, Person } from "../api/types";
import "./dienststunden/Dienststunden.css";

const SCHNELLAUSWAHL_STUNDEN = [0.5, 1, 1.5, 2, 3, 4];
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

function initialenAus(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((teil) => teil.charAt(0))
    .join("")
    .toUpperCase();
}

function heuteAlsDatum(): string {
  return new Date().toISOString().slice(0, 10);
}

export function DienststundenManuelleEintragung() {
  const { token } = useParams<{ token: string }>();
  const [info, setInfo] = useState<DienststundenReservierungInfo | null>(null);
  const [personen, setPersonen] = useState<Person[]>([]);
  const [funktionen, setFunktionen] = useState<FunktionDienststunden[]>([]);
  const [ladeFehler, setLadeFehler] = useState<string | null>(null);

  const [suche, setSuche] = useState("");
  const [ausgewaehltePerson, setAusgewaehltePerson] = useState<Person | null>(null);
  const [funktionId, setFunktionId] = useState<string>("");
  const [stunden, setStunden] = useState<number>(1);
  const [datum, setDatum] = useState(heuteAlsDatum());
  const [fehler, setFehler] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);
  const [erfolg, setErfolg] = useState(false);
  const [gesperrtMinuten] = useState(() => eintragungGesperrtMinuten());

  useEffect(() => {
    if (!token) return;
    Promise.all([
      holeDienststundenReservierung(token),
      holeDienststundenReservierungPersonen(token),
      holeFunktionenDienststunden(),
    ])
      .then(([infoResult, personenResult, funktionenResult]) => {
        setInfo(infoResult);
        setPersonen(personenResult);
        setFunktionen(funktionenResult);
        if (funktionenResult.length > 0) setFunktionId(String(funktionenResult[0].id));
      })
      .catch((err) =>
        setLadeFehler(err instanceof ApiError ? String(err.detail) : "Reservierung konnte nicht geladen werden.")
      );
  }, [token]);

  const trefferliste =
    suche.trim().length === 0
      ? []
      : personen.filter((p) => p.name.toLowerCase().includes(suche.trim().toLowerCase())).slice(0, 8);

  async function personAuswaehlen(p: Person) {
    setAusgewaehltePerson(p);
    setSuche("");
    if (p.funktion_id) setFunktionId(String(p.funktion_id));
    try {
      if (token) await dienststundenReservierungVorschauSetzen(token, p.id);
    } catch {
      // Best effort – die Vorschau am Gerätehaus ist nur ein Komfortfeature.
    }
  }

  async function absenden(e: FormEvent) {
    e.preventDefault();
    if (!token || !ausgewaehltePerson || !funktionId) return;
    setLaeuft(true);
    setFehler(null);
    try {
      await dienststundenReservierungEinloesen(token, {
        person_id: ausgewaehltePerson.id,
        funktion_id: Number(funktionId),
        stunden,
        datum,
      });
      eintragungVermerken();
      setErfolg(true);
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Eintragung fehlgeschlagen.");
    } finally {
      setLaeuft(false);
    }
  }

  if (gesperrtMinuten !== null) {
    return (
      <div className="seite">
        <div className="karte">
          <h1>Kurz gewartet</h1>
          <p>
            Du hast dich auf diesem Gerät vor Kurzem bereits eingetragen. Bitte warte noch ca.{" "}
            {gesperrtMinuten} {gesperrtMinuten === 1 ? "Minute" : "Minuten"}, bevor du es erneut
            versuchst.
          </p>
        </div>
      </div>
    );
  }

  if (ladeFehler) {
    return (
      <div className="seite">
        <p className="fehlertext">{ladeFehler}</p>
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
          <p>Deine Dienststunden wurden erfasst. Du kannst diese Seite jetzt schließen.</p>
        </div>
      </div>
    );
  }

  if (info.bereits_eingeloest) {
    return (
      <div className="seite">
        <div className="karte">
          <h1>Bereits genutzt</h1>
          <p>Diese Reservierung wurde bereits verwendet. Bitte am Gerätehaus einen neuen QR-Code erzeugen.</p>
        </div>
      </div>
    );
  }

  if (info.abgelaufen) {
    return (
      <div className="seite">
        <div className="karte">
          <h1>Abgelaufen</h1>
          <p>Diese Reservierung ist abgelaufen. Bitte am Gerätehaus einen neuen QR-Code erzeugen.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="seite">
      <div className="karte">
        <h1>Dienststunden ohne Barcode eintragen</h1>

        <form onSubmit={absenden}>
          <div className="formular-feld">
          <label htmlFor="dsme-person">Wer bist du?</label>
          {ausgewaehltePerson ? (
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
              {ausgewaehltePerson.bild_url ? (
                <img
                  src={ausgewaehltePerson.bild_url}
                  alt={ausgewaehltePerson.name}
                  style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover" }}
                />
              ) : (
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    background: "var(--farbe-primaer, #ffa633)",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                  }}
                >
                  {initialenAus(ausgewaehltePerson.name)}
                </div>
              )}
              <strong>{ausgewaehltePerson.name}</strong>
              <button type="button" className="sekundaer" onClick={() => setAusgewaehltePerson(null)}>
                Ändern
              </button>
            </div>
          ) : (
            <>
              <input
                id="dsme-person"
                value={suche}
                onChange={(e) => setSuche(e.target.value)}
                placeholder="Namen eingeben und auswählen…"
                autoFocus
              />
              {trefferliste.length > 0 && (
                <ul style={{ listStyle: "none", padding: 0, margin: "0.25rem 0" }}>
                  {trefferliste.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        className="sekundaer"
                        style={{ width: "100%", textAlign: "left" }}
                        onClick={() => personAuswaehlen(p)}
                      >
                        {p.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {suche.trim().length > 0 && trefferliste.length === 0 && (
                <p style={{ color: "var(--farbe-text-mute)", fontSize: "0.85rem" }}>
                  Keine Person gefunden. Bitte am Gerätehaus in den Personen-Stammdaten anlegen lassen.
                </p>
              )}
            </>
          )}
          </div>

          <div className="formular-feld">
            <label htmlFor="dsme-funktion">Funktion</label>
            <select
              id="dsme-funktion"
              value={funktionId}
              onChange={(e) => setFunktionId(e.target.value)}
              required
            >
              {funktionen.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

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
            <label htmlFor="dsme-datum">Datum</label>
            <input
              id="dsme-datum"
              type="date"
              value={datum}
              onChange={(e) => setDatum(e.target.value)}
              required
            />
          </div>

          {fehler && <p className="fehlertext">{fehler}</p>}

          <button type="submit" disabled={laeuft || !ausgewaehltePerson}>
            {laeuft ? "Wird gespeichert…" : "Eintragen"}
          </button>
        </form>
      </div>
    </div>
  );
}
