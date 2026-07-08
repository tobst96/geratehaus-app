import { Fehlertext } from "../components/Fehlertext";
import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { pinSetzen, pinSetzenInfo, type PinTokenInfo } from "../api/auth";
import { ApiError } from "../api/client";
import { Ladeanzeige } from "../components/Ladeanzeige";

export function PinSetzen() {
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
      .catch((err) => setLadeFehler(err instanceof ApiError ? String(err.detail) : "Link ungültig."));
  }, [token]);

  async function absenden(e: FormEvent) {
    e.preventDefault();
    setFehler(null);
    if (pin.length < 4) {
      setFehler("Der PIN muss mindestens 4 Zeichen haben.");
      return;
    }
    if (pin !== pin2) {
      setFehler("Die PINs stimmen nicht überein.");
      return;
    }
    setLaeuft(true);
    try {
      await pinSetzen(token, pin);
      setFertig(true);
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "PIN konnte nicht gesetzt werden.");
    } finally {
      setLaeuft(false);
    }
  }

  if (ladeFehler) {
    return (
      <div className="seite">
        <div className="karte">
          <h1>PIN setzen</h1>
          <Fehlertext>{ladeFehler}</Fehlertext>
        </div>
      </div>
    );
  }
  if (!info) return <Ladeanzeige />;

  return (
    <div className="seite">
      <div className="karte">
        <h1>PIN setzen</h1>
        {fertig ? (
          <p>Dein PIN wurde gesetzt. Du kannst dich jetzt am Gerätehaus mit deinem Namen und PIN anmelden.</p>
        ) : !info.gueltig ? (
          <Fehlertext>Dieser Link ist abgelaufen oder wurde bereits verwendet.</Fehlertext>
        ) : (
          <form onSubmit={absenden}>
            <p style={{ color: "var(--farbe-text-mute)" }}>
              Für <strong>{info.name}</strong> einen persönlichen PIN festlegen.
            </p>
            <div className="formular-feld">
              <label htmlFor="pin1">Neuer PIN</label>
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
              <label htmlFor="pin2">PIN wiederholen</label>
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
              {laeuft ? "Wird gespeichert…" : "PIN setzen"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
