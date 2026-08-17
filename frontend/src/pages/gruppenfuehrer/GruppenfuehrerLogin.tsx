import { Fehlertext } from "../../components/Fehlertext";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ApiError } from "../../api/client";
import { texte } from "../../i18n/texte";

export function GruppenfuehrerLogin() {
  const t = texte.gruppenfuehrer_login;
  const { gruppenfuehrerStepUp, gruppenfuehrer2faEinrichten, gruppenfuehrer2faAbschliessen } = useAuth();
  const navigate = useNavigate();
  const [fehler, setFehler] = useState<string | null>(null);
  const [ladevorgang, setLadevorgang] = useState(false);

  // Step-up-Ergebnis: "laeuft" während der initiale Zugriffscheck läuft,
  // "verboten" wenn die Person keinen erhöhten Zugang hat (403).
  const [stepUpStatus, setStepUpStatus] = useState<"laeuft" | "verboten" | "erledigt">("laeuft");

  // 2FA-Schritt
  const [challenge, setChallenge] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [angemeldetBleiben, setAngemeldetBleiben] = useState(false);

  // Pflicht-2FA: erzwungene Einrichtung
  const [einrichtung, setEinrichtung] = useState(false);
  const [emailGesetzt, setEmailGesetzt] = useState(false);
  const [email, setEmail] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);

  useEffect(() => {
    async function pruefen() {
      try {
        const { zweiFaktorErforderlich, einrichtungErforderlich, emailGesetzt: mailDa, challenge: ch } =
          await gruppenfuehrerStepUp();
        if (einrichtungErforderlich && ch) {
          setChallenge(ch);
          setEmailGesetzt(mailDa);
          setEinrichtung(true);
          setStepUpStatus("erledigt");
        } else if (zweiFaktorErforderlich && ch) {
          setChallenge(ch);
          setStepUpStatus("erledigt");
        } else {
          navigate("/gruppenfuehrer", { replace: true });
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          navigate("/mitglied/login", { replace: true });
          return;
        }
        if (err instanceof ApiError && err.status === 403) {
          setStepUpStatus("verboten");
          return;
        }
        setFehler(err instanceof ApiError ? String(err.detail) : t.anmeldung_fehler);
        setStepUpStatus("verboten");
      }
    }
    pruefen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function einrichtenAbsenden(e: FormEvent) {
    e.preventDefault();
    if (!challenge) return;
    setFehler(null);
    setLadevorgang(true);
    try {
      const ergebnis = await gruppenfuehrer2faEinrichten(challenge, emailGesetzt ? undefined : email);
      setRecoveryCodes(ergebnis.recovery_codes);
      setChallenge(ergebnis.challenge);
      setEinrichtung(false);
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : t.einrichtung_fehler);
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

  if (stepUpStatus === "laeuft") {
    return (
      <div>
        <h1>{t.titel}</h1>
        <p className="text-mute">{t.pruefung_laeuft}</p>
      </div>
    );
  }

  if (stepUpStatus === "verboten") {
    return (
      <div>
        <h1>{t.titel}</h1>
        <div className="karte">
          <Fehlertext>{fehler ?? t.kein_zugang}</Fehlertext>
          <p style={{ marginTop: 12 }}>
            <Link to="/mitglied">{t.zurueck_zum_mitgliederbereich}</Link>
          </p>
        </div>
      </div>
    );
  }

  // Recovery-Codes anzeigen (einmalig), bevor es zur Code-Eingabe geht.
  if (recoveryCodes) {
    return (
      <div>
        <h1>{t.recovery_titel}</h1>
        <div className="karte">
          <p className="text-mute">{t.recovery_hinweis}</p>
          <ul style={{ fontFamily: "monospace", fontSize: "1.1rem", lineHeight: 1.8, listStyle: "none", padding: 0 }}>
            {recoveryCodes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <button type="button" onClick={() => setRecoveryCodes(null)}>
            {t.recovery_weiter}
          </button>
        </div>
      </div>
    );
  }

  // Pflicht-2FA: erzwungene Einrichtung (E-Mail hinterlegen + aktivieren).
  if (einrichtung) {
    return (
      <div>
        <h1>{t.einrichtung_titel}</h1>
        <form onSubmit={einrichtenAbsenden} className="karte">
          <p className="text-mute">{t.einrichtung_hinweis}</p>
          {!emailGesetzt && (
            <div className="formular-feld">
              <label htmlFor="einricht-email">{t.einrichtung_email_label}</label>
              <input
                id="einricht-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus
                required
              />
            </div>
          )}
          {fehler && <Fehlertext>{fehler}</Fehlertext>}
          <button type="submit" disabled={ladevorgang}>
            {ladevorgang ? t.einrichtung_laeuft : t.einrichtung_button}
          </button>
        </form>
      </div>
    );
  }

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
            inputMode="numeric"
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
