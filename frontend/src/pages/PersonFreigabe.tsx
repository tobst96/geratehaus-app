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
import { texte } from "../i18n/texte";

export function PersonFreigabe() {
  const t = texte.person_freigabe;
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
      .catch((err) => setLadeFehler(err instanceof ApiError ? String(err.detail) : t.ungueltig));
  }, [token, t.ungueltig]);

  async function freigeben(e: FormEvent) {
    e.preventDefault();
    setFehler(null);
    if (!email.trim()) {
      setFehler(t.email_pflicht);
      return;
    }
    if (pin && pin.length < 4) {
      setFehler(t.pin_zu_kurz);
      return;
    }
    setLaeuft(true);
    try {
      await freigabeFreigeben(token, email.trim(), pin || null);
      setErgebnis("freigegeben");
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : t.freigeben_fehler);
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
      setFehler(err instanceof ApiError ? String(err.detail) : t.ablehnen_fehler);
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
        {ergebnis === "freigegeben" ? (
          <p>
            <strong>{info.name}</strong> {t.freigegeben_suffix}
          </p>
        ) : ergebnis === "abgelehnt" ? (
          <p>{t.abgelehnt}</p>
        ) : !info.offen ? (
          <Fehlertext>{t.nicht_mehr_offen}</Fehlertext>
        ) : ablehnenModus ? (
          <>
            <p>
              {t.ablehnen_frage_prefix} <strong>{info.name}</strong> {t.ablehnen_frage_suffix}
            </p>
            {fehler && <Fehlertext>{fehler}</Fehlertext>}
            <button type="button" onClick={ablehnen} disabled={laeuft}>
              {laeuft ? t.ablehnen_laeuft : t.ablehnen}
            </button>
          </>
        ) : (
          <form onSubmit={freigeben}>
            <p className="text-mute">
              {t.hinterlegen_prefix} <strong>{info.name}</strong> {t.hinterlegen_suffix}
            </p>
            <div className="formular-feld">
              <label htmlFor="pf-email">{t.label_email}</label>
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
              <label htmlFor="pf-pin">{t.label_pin_optional}</label>
              <input
                id="pf-pin"
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder={t.pin_platzhalter}
              />
            </div>
            {fehler && <Fehlertext>{fehler}</Fehlertext>}
            <button type="submit" disabled={laeuft}>
              {laeuft ? t.speichern_laeuft : t.freigeben}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
