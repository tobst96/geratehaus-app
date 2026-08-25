import { Fehlertext } from "../components/Fehlertext";
import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import {
  holeReservierung,
  holeReservierungPersonen,
  reservierungEinloesen,
  reservierungVorschauSetzen,
} from "../api/reservierungen";
import { ApiError } from "../api/client";
import { eintragungGesperrtMinuten, eintragungVermerken } from "../utils/eintragungssperre";
import { Ladeanzeige } from "../components/Ladeanzeige";
import type { Person, ReservierungInfo } from "../api/types";
import { texte } from "../i18n/texte";

const AGT_MAX_MINUTEN = 35;
const AGT_DEFAULT_MINUTEN = 30;

function initialenAus(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((teil) => teil.charAt(0))
    .join("")
    .toUpperCase();
}

export function ManuelleEintragung() {
  const t = texte.manuelle_eintragung;
  const { token } = useParams<{ token: string }>();
  const [info, setInfo] = useState<ReservierungInfo | null>(null);
  const [personen, setPersonen] = useState<Person[]>([]);
  const [ladeFehler, setLadeFehler] = useState<string | null>(null);

  const [suche, setSuche] = useState("");
  const [ausgewaehltePerson, setAusgewaehltePerson] = useState<Person | null>(null);
  const [pin, setPin] = useState("");
  const [vab, setVab] = useState(false);
  const [atemschutzAktiv, setAtemschutzAktiv] = useState(false);
  const [atemschutzminuten, setAtemschutzminuten] = useState(0);
  const [bemerkung, setBemerkung] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);
  const [erfolg, setErfolg] = useState(false);
  const [gesperrtMinuten] = useState(() => eintragungGesperrtMinuten());

  useEffect(() => {
    if (!token) return;
    Promise.all([holeReservierung(token), holeReservierungPersonen(token)])
      .then(([infoResult, personenResult]) => {
        setInfo(infoResult);
        setPersonen(personenResult);
      })
      .catch((err) =>
        setLadeFehler(err instanceof ApiError ? String(err.detail) : t.reservierung_fehler)
      );
    // t.reservierung_fehler kommt aus dem statischen texte-Import und ändert sich
    // nie zur Laufzeit - Aufnahme in die Deps ist sicher (kein Endlosschleifen-Risiko).
  }, [token, t.reservierung_fehler]);

  const trefferliste =
    suche.trim().length === 0
      ? []
      : personen.filter((p) => p.name.toLowerCase().includes(suche.trim().toLowerCase())).slice(0, 8);

  function personAuswaehlen(p: Person) {
    setAusgewaehltePerson(p);
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
      await reservierungVorschauSetzen(token, ausgewaehltePerson.id, pin);
      await reservierungEinloesen(token, {
        person_id: ausgewaehltePerson.id,
        vab,
        atemschutzminuten: atemschutzAktiv ? atemschutzminuten : 0,
        bemerkung: bemerkung.trim() || null,
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
            {t.eingetragen_prefix} <strong>{info.bezeichnung}</strong> {t.eingetragen_mitte} „{info.einsatz_titel}“
            {t.eingetragen_suffix}
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
        <p className="text-mute">
          {info.bezeichnung} · {t.einsatz_label} „{info.einsatz_titel}“
          {info.fahrzeug_name ? ` · ${info.fahrzeug_name}` : ""}
        </p>

        <form onSubmit={absenden}>
          <div className="formular-feld">
          <label htmlFor="me-person">{t.wer_bist_du}</label>
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
                id="me-person"
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
              <label htmlFor="me-pin">{t.dein_pin}</label>
              <input
                id="me-pin"
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                required
              />
            </div>
          )}

          {!info.nur_geraetehaus && !info.auf_anfahrt && (
            <>
              <div className="formular-feld">
                <label>
                  <input type="checkbox" checked={vab} onChange={(e) => setVab(e.target.checked)} />{" "}
                  {t.vab}
                </label>
              </div>

              <div className="formular-feld">
                <label>
                  <input
                    type="checkbox"
                    checked={atemschutzAktiv}
                    onChange={(e) => {
                      setAtemschutzAktiv(e.target.checked);
                      if (!e.target.checked) setAtemschutzminuten(0);
                      else if (atemschutzminuten === 0) setAtemschutzminuten(AGT_DEFAULT_MINUTEN);
                    }}
                  />{" "}
                  {t.atemschutz_angelegt}
                </label>
              </div>

              {atemschutzAktiv && (
                <div className="formular-feld">
                  <label htmlFor="me-atemschutz">
                    {t.atemschutzminuten_label} <strong>{atemschutzminuten}</strong>
                  </label>
                  <input
                    id="me-atemschutz"
                    type="range"
                    min={0}
                    max={AGT_MAX_MINUTEN}
                    step={1}
                    value={atemschutzminuten}
                    onChange={(e) => setAtemschutzminuten(Number(e.target.value))}
                    style={{ width: "100%" }}
                  />
                </div>
              )}
            </>
          )}

          <div className="formular-feld">
            <label htmlFor="me-bemerkung">{t.bemerkung_label}</label>
            <textarea
              id="me-bemerkung"
              rows={2}
              value={bemerkung}
              onChange={(e) => setBemerkung(e.target.value)}
              placeholder={t.bemerkung_platzhalter}
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
