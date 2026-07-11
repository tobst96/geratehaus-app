import { Fehlertext } from "../../../components/Fehlertext";
import { Gespeichert } from "../../../components/Gespeichert";
import { Ladeanzeige } from "../../../components/Ladeanzeige";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../../../api/client";
import { holeEinstellungen, schreibeEinstellungen } from "../../../api/gruppenfuehrer";
import { texte } from "../../../i18n/texte";

const t = texte.elw;

export function ElwModul() {
  const [email, setEmail] = useState<string | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [gespeichert, setGespeichert] = useState(false);
  const [laeuft, setLaeuft] = useState(false);

  useEffect(() => {
    holeEinstellungen()
      .then((w) => setEmail(String(w.elw_email ?? "")))
      .catch((err) => setFehler(err instanceof ApiError ? String(err.detail) : t.fehler_laden));
  }, []);

  async function speichern() {
    if (email === null) return;
    setLaeuft(true);
    setFehler(null);
    setGespeichert(false);
    try {
      await schreibeEinstellungen({ elw_email: email.trim() });
      setGespeichert(true);
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : t.fehler_speichern);
    } finally {
      setLaeuft(false);
    }
  }

  if (email === null && !fehler) return <Ladeanzeige />;

  return (
    <div>
      <p>
        <Link to="/gruppenfuehrer/module">← Zurück zu den Modulen</Link>
      </p>
      <h1>{t.admin_titel}</h1>
      <p className="hinweistext">{t.admin_intro}</p>

      {fehler && <Fehlertext>{fehler}</Fehlertext>}

      <div className="karte">
        <div className="formular-feld">
          <label htmlFor="elw-email">{t.email_label}</label>
          <input
            id="elw-email"
            type="email"
            value={email ?? ""}
            onChange={(e) => {
              setEmail(e.target.value);
              setGespeichert(false);
            }}
            placeholder={t.email_platzhalter}
            autoComplete="off"
          />
        </div>
        <div className="formular-feld">
          <button onClick={speichern} disabled={laeuft}>
            {t.speichern}
          </button>
          {gespeichert && <Gespeichert />}
        </div>
      </div>
    </div>
  );
}
