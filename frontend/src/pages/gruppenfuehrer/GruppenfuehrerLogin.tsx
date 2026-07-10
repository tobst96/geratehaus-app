import { Fehlertext } from "../../components/Fehlertext";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ApiError } from "../../api/client";
import { texte } from "../../i18n/texte";

export function GruppenfuehrerLogin() {
  const t = texte.gruppenfuehrer_login;
  const { gruppenfuehrerAnmelden, gruppenfuehrer2faAbschliessen } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [passwort, setPasswort] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);
  const [ladevorgang, setLadevorgang] = useState(false);

  // 2FA-Schritt
  const [challenge, setChallenge] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [angemeldetBleiben, setAngemeldetBleiben] = useState(false);

  async function absenden(e: FormEvent) {
    e.preventDefault();
    setFehler(null);
    setLadevorgang(true);
    try {
      const { zweiFaktorErforderlich, challenge: ch } = await gruppenfuehrerAnmelden(username, passwort);
      if (zweiFaktorErforderlich && ch) {
        setChallenge(ch);
      } else {
        navigate("/gruppenfuehrer");
      }
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : t.anmeldung_fehler);
    } finally {
      setLadevorgang(false);
    }
  }

  async function codeAbsenden(e: FormEvent) {
    e.preventDefault();
    if (!challenge) return;
    setFehler(null);
    setLadevorgang(true);
    try {
      await gruppenfuehrer2faAbschliessen(challenge, code, angemeldetBleiben);
      navigate("/gruppenfuehrer");
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : t.code_ungueltig);
    } finally {
      setLadevorgang(false);
    }
  }

  if (challenge) {
    return (
      <div>
        <h1>{t.code_titel}</h1>
        <form onSubmit={codeAbsenden} className="karte">
          <p className="text-mute">
{t.code_hinweis}
          </p>
          <div className="formular-feld">
            <label htmlFor="code">{t.code_label}</label>
            <input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoFocus
              autoComplete="one-time-code"
              required
            />
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <input
              type="checkbox"
              checked={angemeldetBleiben}
              onChange={(e) => setAngemeldetBleiben(e.target.checked)}
            />
            {t.geraet_vertrauen}
          </label>
          {fehler && <Fehlertext>{fehler}</Fehlertext>}
          <button type="submit" disabled={ladevorgang}>
            {ladevorgang ? t.pruefe : t.bestaetigen}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <h1>{t.titel}</h1>
      <form onSubmit={absenden} className="karte">
        <div className="formular-feld">
          <label htmlFor="username">{t.name}</label>
          <input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
        </div>
        <div className="formular-feld">
          <label htmlFor="passwort">{t.passwort}</label>
          <input
            id="passwort"
            type="password"
            value={passwort}
            onChange={(e) => setPasswort(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
        {fehler && <Fehlertext>{fehler}</Fehlertext>}
        <button type="submit" disabled={ladevorgang}>
          {ladevorgang ? t.anmelden_laeuft : t.anmelden}
        </button>
      </form>
    </div>
  );
}
