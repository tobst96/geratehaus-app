import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { markiereAlsEingerichtet, setupAusfuehren, setupLogoHochladen } from "../../api/setup";
import { ApiError } from "../../api/client";
import { useConfig } from "../../context/ConfigContext";

const SCHRITTE = ["Organisation", "Logo", "Farben", "Admin-Passwort", "Fehlerberichte"] as const;

export function SetupWizard() {
  const navigate = useNavigate();
  const { neuLaden } = useConfig();

  const [schritt, setSchritt] = useState(0);
  const [organisationName, setOrganisationName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoLadevorgang, setLogoLadevorgang] = useState(false);
  const [farbePrimaer, setFarbePrimaer] = useState("#FFA633");
  const [farbeAkzent, setFarbeAkzent] = useState("#1A1A1A");
  const [adminPasswort, setAdminPasswort] = useState("");
  const [adminPasswortWiederholung, setAdminPasswortWiederholung] = useState("");
  const [fehlerberichteAktiv, setFehlerberichteAktiv] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [wirdAbgeschlossen, setWirdAbgeschlossen] = useState(false);

  async function logoAuswaehlen(datei: File) {
    setLogoLadevorgang(true);
    setFehler(null);
    try {
      const { logo_url } = await setupLogoHochladen(datei);
      setLogoUrl(logo_url);
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Logo-Upload fehlgeschlagen.");
    } finally {
      setLogoLadevorgang(false);
    }
  }

  function kannWeiter(): boolean {
    switch (schritt) {
      case 0:
        return organisationName.trim().length > 0;
      case 3:
        return adminPasswort.length >= 8 && adminPasswort === adminPasswortWiederholung;
      default:
        return true;
    }
  }

  async function abschliessen() {
    setFehler(null);
    setWirdAbgeschlossen(true);
    try {
      await setupAusfuehren({
        organisation_name: organisationName,
        farbe_primaer: farbePrimaer,
        farbe_akzent: farbeAkzent,
        admin_passwort: adminPasswort,
        fehlerberichte_aktiv: fehlerberichteAktiv,
      });
      markiereAlsEingerichtet();
      neuLaden();
      navigate("/");
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Einrichtung fehlgeschlagen.");
    } finally {
      setWirdAbgeschlossen(false);
    }
  }

  return (
    <div>
      <h1>Einrichtung von Gerätehaus.app</h1>
      <p>
        Schritt {schritt + 1} von {SCHRITTE.length}: <strong>{SCHRITTE[schritt]}</strong>
      </p>

      <div className="karte">
        {schritt === 0 && (
          <>
            <label htmlFor="organisation-name">Name der Organisation</label>
            <input
              id="organisation-name"
              value={organisationName}
              onChange={(e) => setOrganisationName(e.target.value)}
              placeholder="z. B. Freiwillige Feuerwehr Musterstadt"
              required
            />
          </>
        )}

        {schritt === 1 && (
          <>
            <p>Lade optional ein Logo hoch (PNG oder SVG). Du kannst diesen Schritt überspringen.</p>
            <input
              type="file"
              accept="image/png,image/svg+xml"
              onChange={(e) => e.target.files?.[0] && logoAuswaehlen(e.target.files[0])}
            />
            {logoLadevorgang && <p>Wird hochgeladen …</p>}
            {logoUrl && <img src={logoUrl} alt="Hochgeladenes Logo" style={{ height: 60, marginTop: 12 }} />}
          </>
        )}

        {schritt === 2 && (
          <>
            <div className="formular-feld">
              <label htmlFor="farbe-primaer">Primärfarbe</label>
              <input
                id="farbe-primaer"
                type="color"
                value={farbePrimaer}
                onChange={(e) => setFarbePrimaer(e.target.value)}
              />
            </div>
            <div className="formular-feld">
              <label htmlFor="farbe-akzent">Akzentfarbe</label>
              <input
                id="farbe-akzent"
                type="color"
                value={farbeAkzent}
                onChange={(e) => setFarbeAkzent(e.target.value)}
              />
            </div>
          </>
        )}

        {schritt === 3 && (
          <>
            <div className="formular-feld">
              <label htmlFor="admin-passwort">Admin-Passwort (mind. 8 Zeichen)</label>
              <input
                id="admin-passwort"
                type="password"
                value={adminPasswort}
                onChange={(e) => setAdminPasswort(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div className="formular-feld">
              <label htmlFor="admin-passwort-wiederholung">Passwort wiederholen</label>
              <input
                id="admin-passwort-wiederholung"
                type="password"
                value={adminPasswortWiederholung}
                onChange={(e) => setAdminPasswortWiederholung(e.target.value)}
                autoComplete="new-password"
              />
              {adminPasswortWiederholung.length > 0 && adminPasswort !== adminPasswortWiederholung && (
                <p className="fehlertext">Die Passwörter stimmen nicht überein.</p>
              )}
            </div>
          </>
        )}

        {schritt === 4 && (
          <>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <input
                type="checkbox"
                checked={fehlerberichteAktiv}
                onChange={(e) => setFehlerberichteAktiv(e.target.checked)}
                style={{ marginTop: 4 }}
              />
              <span>
                Technische Fehlerberichte an den Entwickler von Gerätehaus.app senden, damit Bugs
                über alle Installationen hinweg schneller gefunden und behoben werden können. Es
                werden nur Stacktraces und technische Fehlerdetails übertragen, keine Namen oder
                sonstigen Inhalte. Jederzeit änderbar unter Moderator → Einstellungen.
              </span>
            </label>
          </>
        )}
      </div>

      {fehler && <p className="fehlertext">{fehler}</p>}

      <div style={{ display: "flex", gap: 12 }}>
        {schritt > 0 && (
          <button type="button" className="sekundaer" onClick={() => setSchritt((s) => s - 1)}>
            Zurück
          </button>
        )}
        {schritt < SCHRITTE.length - 1 ? (
          <button type="button" disabled={!kannWeiter()} onClick={() => setSchritt((s) => s + 1)}>
            Weiter
          </button>
        ) : (
          <button type="button" disabled={!kannWeiter() || wirdAbgeschlossen} onClick={abschliessen}>
            {wirdAbgeschlossen ? "Wird eingerichtet …" : "Einrichtung abschließen"}
          </button>
        )}
      </div>
    </div>
  );
}
