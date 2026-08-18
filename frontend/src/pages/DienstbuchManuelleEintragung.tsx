import { Fehlertext } from "../components/Fehlertext";
import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import {
  dienstbuchReservierungEinloesen,
  dienstbuchReservierungVorschauSetzen,
  holeDienstbuchReservierung,
  holeDienstbuchReservierungPersonen,
} from "../api/dienstbuchReservierungen";
import { holeGruppen } from "../api/stammdaten";
import { ApiError } from "../api/client";
import { eintragungGesperrtMinuten, eintragungVermerken } from "../utils/eintragungssperre";
import { Ladeanzeige } from "../components/Ladeanzeige";
import type { DienstbuchReservierungInfo, Gruppe, Person } from "../api/types";
import { texte } from "../i18n/texte";

function initialenAus(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((teil) => teil.charAt(0))
    .join("")
    .toUpperCase();
}

export function DienstbuchManuelleEintragung() {
  const t = texte.manuelle_eintragung;
  const t2 = texte.dienstbuch_eintragung;
  const { token } = useParams<{ token: string }>();
  const [info, setInfo] = useState<DienstbuchReservierungInfo | null>(null);
  const [personen, setPersonen] = useState<Person[]>([]);
  const [gruppen, setGruppen] = useState<Gruppe[]>([]);
  const [ladeFehler, setLadeFehler] = useState<string | null>(null);

  const [suche, setSuche] = useState("");
  const [ausgewaehltePerson, setAusgewaehltePerson] = useState<Person | null>(null);
  const [pin, setPin] = useState("");
  const [gruppeId, setGruppeId] = useState<number | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);
  const [erfolg, setErfolg] = useState(false);
  const [gesperrtMinuten] = useState(() => eintragungGesperrtMinuten());

  useEffect(() => {
    if (!token) return;
    Promise.all([
      holeDienstbuchReservierung(token),
      holeDienstbuchReservierungPersonen(token),
      holeGruppen(),
    ])
      .then(([infoResult, personenResult, gruppenResult]) => {
        setInfo(infoResult);
        setPersonen(personenResult);
        setGruppen(gruppenResult);
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
    setGruppeId(p.gruppe_id);
    setSuche("");
    setPin("");
    setFehler(null);
  }

  async function absenden(e: FormEvent) {
    e.preventDefault();
    if (!token || !ausgewaehltePerson) return;
    setLaeuft(true);
    setFehler(null);
    try {
      await dienstbuchReservierungVorschauSetzen(token, ausgewaehltePerson.id, pin);
      await dienstbuchReservierungEinloesen(token, {
        person_id: ausgewaehltePerson.id,
        gruppe_id: gruppeId,
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
          <p>
            {t2.eingetragen_prefix} „{info.dienstbuch_titel}“ {t.eingetragen_suffix}
          </p>
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
        <h1>{t.titel}</h1>
        <p className="text-mute">{t2.dienstbuch_label} „{info.dienstbuch_titel}“</p>

        <form onSubmit={absenden}>
          <div className="formular-feld">
          <label htmlFor="dbme-person">{t.wer_bist_du}</label>
          {ausgewaehltePerson ? (
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
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
              <strong>{ausgewaehltePerson.name}</strong>
              <button type="button" className="sekundaer" onClick={() => setAusgewaehltePerson(null)}>
                {t.aendern}
              </button>
            </div>
          ) : (
            <>
              <input
                id="dbme-person"
                value={suche}
                onChange={(e) => setSuche(e.target.value)}
                placeholder={t.namen_platzhalter}
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
              <label htmlFor="dbme-pin">{t.dein_pin}</label>
              <input
                id="dbme-pin"
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                required
              />
            </div>
          )}

          <div className="formular-feld">
            <label htmlFor="dbme-gruppe">{t2.gruppe}</label>
            <select
              id="dbme-gruppe"
              value={gruppeId ?? ""}
              onChange={(e) => setGruppeId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">{t2.keine_gruppe}</option>
              {gruppen.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
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
