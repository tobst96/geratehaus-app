import { Fehlertext } from "../components/Fehlertext";
import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { pinSetzen, pinSetzenInfo, type PinTokenInfo } from "../api/auth";
import { ApiError } from "../api/client";
import { Ladeanzeige } from "../components/Ladeanzeige";
import { texte } from "../i18n/texte";

export function PinSetzen() {
  const t = texte.pin_setzen;
  const { token = "" } = useParams<{ token: string }>();
  const [info, setInfo] = useState<PinTokenInfo | null>(null);
  const [ladeFehler, setLadeFehler] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);
  const [fertig, setFertig] = useState(false);

  useEffect(() => {
    pinSetzenInfo(token)
      .then(setInfo)
      .catch((err) => setLadeFehler(err instanceof ApiError ? String(err.detail) : t.link_ungueltig));
  }, [token, t.link_ungueltig]);

  async function absenden(e: FormEvent) {
    e.preventDefault();
    setFehler(null);
    if (pin.length < 4) {
      setFehler(t.pin_zu_kurz);
      return;
    }
    if (pin !== pin2) {
      setFehler(t.pins_ungleich);
      return;
    }
    setLaeuft(true);
    try {
      await pinSetzen(token, pin);
      setFertig(true);
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : t.fehler_speichern);
    } finally {
      setLaeuft(false);
    }
  }

  if (ladeFehler) {
    return (
      <div className="seite">
        <div className="karte">
          <h1>{t.titel}</h1>
          <Fehlertext>{ladeFehler}</Fehlertext>
        </div>
      </div>
    );
  }
  if (!info) return <Ladeanzeige />;

  return (
    <div className="seite">
      <div className="karte">
        <h1>{t.titel}</h1>
        {fertig ? (
          <p>{t.fertig}</p>
        ) : !info.gueltig ? (
          <Fehlertext>{t.link_abgelaufen}</Fehlertext>
        ) : (
          <form onSubmit={absenden}>
            <p className="text-mute">
              {t.fuer_person_prefix} <strong>{info.name}</strong> {t.fuer_person_suffix}
            </p>
            <div className="formular-feld">
              <label htmlFor="pin1">{t.label_pin}</label>
              <input
                id="pin1"
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                autoFocus
                required
              />
            </div>
            <div className="formular-feld">
              <label htmlFor="pin2">{t.label_pin_wiederholen}</label>
              <input
                id="pin2"
                type="password"
                inputMode="numeric"
                value={pin2}
                onChange={(e) => setPin2(e.target.value)}
                required
              />
            </div>
            {fehler && <Fehlertext>{fehler}</Fehlertext>}
            <button type="submit" disabled={laeuft}>
              {laeuft ? t.speichern_laeuft : t.titel}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
