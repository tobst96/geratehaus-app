import { Fehlertext } from "../../components/Fehlertext";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { mitgliedPasswortLogin, passwortAnfordern } from "../../api/auth";
import { ApiError } from "../../api/client";
import { texte } from "../../i18n/texte";

export function MitgliedLogin() {
  const t = texte.mitglied_login;
  const { identitaetSpeichern } = useAuth();
  const navigate = useNavigate();

  // Persönlicher Passwort-Login – einzige Anmeldemöglichkeit auf dieser Seite.
  // Barcode/PIN sind bewusst nicht mehr verfügbar (nur noch am Kiosk).
  const [pwEmail, setPwEmail] = useState("");
  const [pwPasswort, setPwPasswort] = useState("");
  const [pwLaeuft, setPwLaeuft] = useState(false);
  const [pwFehler, setPwFehler] = useState<string | null>(null);
  const [pwLinkGesendet, setPwLinkGesendet] = useState(false);

  async function passwortLogin(e: FormEvent) {
    e.preventDefault();
    setPwFehler(null);
    setPwLaeuft(true);
    try {
      const identitaet = await mitgliedPasswortLogin(pwEmail.trim(), pwPasswort);
      identitaetSpeichern(identitaet.name);
      navigate("/mitglied");
    } catch (err) {
      setPwFehler(err instanceof ApiError ? String(err.detail) : t.pw_fehler);
    } finally {
      setPwLaeuft(false);
    }
  }

  async function passwortLinkAnfordern() {
    setPwFehler(null);
    if (!pwEmail.trim()) {
      setPwFehler(t.pw_name_fehlt);
      return;
    }
    try {
      await passwortAnfordern(pwEmail.trim());
    } catch {
      /* Bewusst kein Fehler nach außen (kein Enumeration-Leak). */
    }
    setPwLinkGesendet(true);
  }

  return (
    <div className="seite">
      <div className="karte">
        <h1>{t.titel}</h1>
        <form onSubmit={passwortLogin}>
          <div className="formular-feld">
            <label htmlFor="pw-name">{t.pw_name_label}</label>
            <input
              id="pw-name"
              type="email"
              value={pwEmail}
              onChange={(e) => setPwEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div className="formular-feld">
            <label htmlFor="pw-passwort">{t.pw_passwort_label}</label>
            <input
              id="pw-passwort"
              type="password"
              value={pwPasswort}
              onChange={(e) => setPwPasswort(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          {pwFehler && <Fehlertext>{pwFehler}</Fehlertext>}
          <button type="submit" disabled={pwLaeuft}>
            {pwLaeuft ? t.pw_anmelden_laeuft : t.pw_anmelden}
          </button>
        </form>
        <p style={{ marginTop: 12, marginBottom: 0 }}>
          <button
            type="button"
            onClick={passwortLinkAnfordern}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              color: "var(--farbe-primaer)",
              textDecoration: "underline",
              cursor: "pointer",
            }}
          >
            {t.pw_link_anfordern}
          </button>
        </p>
        {pwLinkGesendet && (
          <p className="text-mute" style={{ marginTop: 8 }}>
            {t.pw_link_gesendet}
          </p>
        )}
      </div>
    </div>
  );
}
