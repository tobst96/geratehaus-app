import { Fehlertext } from "../components/Fehlertext";
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
import { formatiereDatum } from "../utils/datum";
import "./dienststunden/Dienststunden.css";
import { texte } from "../i18n/texte";

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
  const t = texte.manuelle_eintragung;
  const t2 = texte.dienststunden_eintragung;
  const { token } = useParams<{ token: string }>();
  const [info, setInfo] = useState<DienststundenReservierungInfo | null>(null);
  const [personen, setPersonen] = useState<Person[]>([]);
  const [funktionen, setFunktionen] = useState<FunktionDienststunden[]>([]);
  const [ladeFehler, setLadeFehler] = useState<string | null>(null);

  const [suche, setSuche] = useState("");
  const [ausgewaehltePerson, setAusgewaehltePerson] = useState<Person | null>(null);
  const [pin, setPin] = useState("");
  const [funktionId, setFunktionId] = useState<string>("");
  const [stunden, setStunden] = useState<number>(1);
  const [datum, setDatum] = useState(heuteAlsDatum());
  const [fehler, setFehler] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);
  const [erfolg, setErfolg] = useState(false);
  const [gebucht, setGebucht] = useState<
    { personName: string; funktionName: string; stundenText: string; datum: string } | null
  >(null);
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
        setLadeFehler(err instanceof ApiError ? String(err.detail) : t.reservierung_fehler)
      );
  }, [token]);

  const trefferliste =
    suche.trim().length === 0
      ? []
      : personen.filter((p) => p.name.toLowerCase().includes(suche.trim().toLowerCase())).slice(0, 8);

  function personAuswaehlen(p: Person) {
    setAusgewaehltePerson(p);
    setSuche("");
    setPin("");
    setFehler(null);
    if (p.funktion_id) setFunktionId(String(p.funktion_id));
  }

  async function absenden(e: FormEvent) {
    e.preventDefault();
    if (!token || !ausgewaehltePerson || !funktionId) return;
    setLaeuft(true);
    setFehler(null);
    try {
      // Identität mit Name+PIN bestätigen (setzt zugleich die Vorschau am Display),
      // bevor eingetragen wird. Ohne (korrekten) PIN wird hier abgebrochen.
      await dienststundenReservierungVorschauSetzen(token, ausgewaehltePerson.id, pin);
      await dienststundenReservierungEinloesen(token, {
        person_id: ausgewaehltePerson.id,
        funktion_id: Number(funktionId),
        stunden,
        datum,
      });
      const funktionName = funktionen.find((f) => String(f.id) === funktionId)?.name ?? "";
      setGebucht({
        personName: ausgewaehltePerson.name,
        funktionName,
        stundenText: stundenAnzeige(stunden),
        datum,
      });
      eintragungVermerken();
      setErfolg(true);
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : t.eintragung_fehler);
    } finally {
      setLaeuft(false);
    }
  }

  if (gesperrtMinuten !== null) {
    return (
      <div className="seite">
        <div className="karte">
          <h1>{t.warten_titel}</h1>
          <p>
            {t.warten_prefix}{" "}
            {gesperrtMinuten} {gesperrtMinuten === 1 ? t.minute : t.minuten}{t.warten_suffix}
          </p>
        </div>
      </div>
    );
  }

  if (ladeFehler) {
    return (
      <div className="seite">
        <Fehlertext>{ladeFehler}</Fehlertext>
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
          <h1>{t.eingetragen_titel}</h1>
          {gebucht && (
            <p style={{ fontWeight: 600 }}>
              {gebucht.personName}: {gebucht.stundenText}
              {gebucht.funktionName ? ` ${t2.als} ${gebucht.funktionName}` : ""} {t2.am}{" "}
              {formatiereDatum(gebucht.datum)}
            </p>
          )}
          <p>{t2.erfasst_text}</p>
        </div>
      </div>
    );
  }

  if (info.bereits_eingeloest) {
    return (
      <div className="seite">
        <div className="karte">
          <h1>{t.bereits_genutzt_titel}</h1>
          <p>{t.bereits_genutzt_text}</p>
        </div>
      </div>
    );
  }

  if (info.abgelaufen) {
    return (
      <div className="seite">
        <div className="karte">
          <h1>{t.abgelaufen_titel}</h1>
          <p>{t.abgelaufen_text}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="seite">
      <div className="karte">
        <h1>{t2.titel}</h1>

        <form onSubmit={absenden}>
          <div className="formular-feld">
          <label htmlFor="dsme-person">{t.wer_bist_du}</label>
          {ausgewaehltePerson ? (
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
              <div className="avatar-initialen">
                  {initialenAus(ausgewaehltePerson.name)}
                </div>
              <strong>{ausgewaehltePerson.name}</strong>
              <button type="button" className="sekundaer" onClick={() => setAusgewaehltePerson(null)}>
                {t.aendern}
              </button>
            </div>
          ) : (
            <>
              <input
                id="dsme-person"
                value={suche}
                onChange={(e) => setSuche(e.target.value)}
                placeholder={t.namen_platzhalter}
                autoFocus
              />
              {trefferliste.length > 0 && (
                <ul className="liste-reset-eng">
                  {trefferliste.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        className="sekundaer volle-breite-links"
                        onClick={() => personAuswaehlen(p)}
                      >
                        {p.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {suche.trim().length > 0 && trefferliste.length === 0 && (
                <p className="hinweistext">{t.keine_person}</p>
              )}
            </>
          )}
          </div>

          {ausgewaehltePerson && !ausgewaehltePerson.pin_gesetzt && (
            <p className="text-mute">{t.kein_pin}</p>
          )}
          {ausgewaehltePerson && ausgewaehltePerson.pin_gesetzt && (
            <div className="formular-feld">
              <label htmlFor="dsme-pin">{t.dein_pin}</label>
              <input
                id="dsme-pin"
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                required
              />
            </div>
          )}

          <div className="formular-feld">
            <label htmlFor="dsme-funktion">{t2.funktion}</label>
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
            <label>{t2.stunden}</label>
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
            <label htmlFor="dsme-datum">{t2.datum}</label>
            <input
              id="dsme-datum"
              type="date"
              value={datum}
              onChange={(e) => setDatum(e.target.value)}
              required
            />
          </div>

          {fehler && <Fehlertext>{fehler}</Fehlertext>}

          <button
            type="submit"
            disabled={laeuft || !ausgewaehltePerson || (ausgewaehltePerson.pin_gesetzt && !pin)}
          >
            {laeuft ? t.speichern_laeuft : t.eintragen}
          </button>
        </form>
      </div>
    </div>
  );
}
