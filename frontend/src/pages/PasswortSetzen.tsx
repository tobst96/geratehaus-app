import { Fehlertext } from "../components/Fehlertext";
import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { passwortSetzen, passwortSetzenInfo, type PinTokenInfo } from "../api/auth";
import { ApiError } from "../api/client";
import { Ladeanzeige } from "../components/Ladeanzeige";
import { texte } from "../i18n/texte";

export function PasswortSetzen() {
  const t = texte.passwort_setzen;
  const { token = "" } = useParams<{ token: string }>();
  const [info, setInfo] = useState<PinTokenInfo | null>(null);
  const [ladeFehler, setLadeFehler] = useState<string | null>(null);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);
  const [fertig, setFertig] = useState(false);

  useEffect(() => {
    passwortSetzenInfo(token)
      .then(setInfo)
      .catch((err) => setLadeFehler(err instanceof ApiError ? String(err.detail) : t.link_ungueltig));
  }, [token, t.link_ungueltig]);

  async function absenden(e: FormEvent) {
    e.preventDefault();
    setFehler(null);
    if (pw.length < 8) {
      setFehler(t.zu_kurz);
      return;
    }
    if (pw !== pw2) {
      setFehler(t.ungleich);
      return;
    }
    setLaeuft(true);
    try {
      await passwortSetzen(token, pw);
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
              <label htmlFor="pw1">{t.label_pw}</label>
              <input
                id="pw1"
                type="password"
                autoComplete="new-password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                autoFocus
                required
              />
            </div>
            <div className="formular-feld">
              <label htmlFor="pw2">{t.label_pw_wiederholen}</label>
              <input
                id="pw2"
                type="password"
                autoComplete="new-password"
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
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
