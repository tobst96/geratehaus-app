import { Fehlertext } from "../components/Fehlertext";
import { useEffect, useState, type FormEvent } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  freigabeAblehnen,
  freigabeFreigeben,
  freigabeInfo,
  type FreigabeTokenInfo,
} from "../api/auth";
import { ApiError } from "../api/client";
import { Ladeanzeige } from "../components/Ladeanzeige";

export function PersonFreigabe() {
  const { token = "" } = useParams<{ token: string }>();
  const [params] = useSearchParams();
  const ablehnenModus = params.get("entscheidung") === "ablehnen";

  const [info, setInfo] = useState<FreigabeTokenInfo | null>(null);
  const [ladeFehler, setLadeFehler] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);
  const [ergebnis, setErgebnis] = useState<"freigegeben" | "abgelehnt" | null>(null);

  useEffect(() => {
    freigabeInfo(token)
      .then((i) => {
        setInfo(i);
        if (i.email) setEmail(i.email);
      })
      .catch((err) => setLadeFehler(err instanceof ApiError ? String(err.detail) : "Freigabe ungültig."));
  }, [token]);

  async function freigeben(e: FormEvent) {
    e.preventDefault();
    setFehler(null);
    if (!email.trim()) {
      setFehler("Bitte eine E-Mail-Adresse angeben.");
      return;
    }
    if (pin && pin.length < 4) {
      setFehler("Der PIN muss mindestens 4 Zeichen haben.");
      return;
    }
    setLaeuft(true);
    try {
      await freigabeFreigeben(token, email.trim(), pin || null);
      setErgebnis("freigegeben");
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Freigabe fehlgeschlagen.");
    } finally {
      setLaeuft(false);
    }
  }

  async function ablehnen() {
    setFehler(null);
    setLaeuft(true);
    try {
      await freigabeAblehnen(token);
      setErgebnis("abgelehnt");
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Ablehnen fehlgeschlagen.");
    } finally {
      setLaeuft(false);
    }
  }

  if (ladeFehler) {
    return (
      <div className="seite">
        <div className="karte">
          <h1>Personen-Freigabe</h1>
          <Fehlertext>{ladeFehler}</Fehlertext>
        </div>
      </div>
    );
  }
  if (!info) return <Ladeanzeige />;

  return (
    <div className="seite">
      <div className="karte">
        <h1>Personen-Freigabe</h1>
        {ergebnis === "freigegeben" ? (
          <p>
            <strong>{info.name}</strong> wurde freigegeben. Falls kein PIN direkt gesetzt wurde, erhält die
            Person einen Link zum Setzen des PINs per E-Mail.
          </p>
        ) : ergebnis === "abgelehnt" ? (
          <p>Die Anfrage wurde abgelehnt.</p>
        ) : !info.offen ? (
          <Fehlertext>Diese Freigabe ist nicht mehr offen.</Fehlertext>
        ) : ablehnenModus ? (
          <>
            <p>
              Anfrage von <strong>{info.name}</strong> ablehnen?
            </p>
            {fehler && <Fehlertext>{fehler}</Fehlertext>}
            <button type="button" onClick={ablehnen} disabled={laeuft}>
              {laeuft ? "Wird abgelehnt…" : "Ablehnen"}
            </button>
          </>
        ) : (
          <form onSubmit={freigeben}>
            <p className="text-mute">
              Für <strong>{info.name}</strong> eine E-Mail-Adresse hinterlegen (und optional direkt einen PIN
              setzen).
            </p>
            <div className="formular-feld">
              <label htmlFor="pf-email">E-Mail-Adresse</label>
              <input
                id="pf-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                required
              />
            </div>
            <div className="formular-feld">
              <label htmlFor="pf-pin">PIN (optional)</label>
              <input
                id="pf-pin"
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Leer lassen, dann setzt die Person ihn selbst"
              />
            </div>
            {fehler && <Fehlertext>{fehler}</Fehlertext>}
            <button type="submit" disabled={laeuft}>
              {laeuft ? "Wird gespeichert…" : "Freigeben"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
