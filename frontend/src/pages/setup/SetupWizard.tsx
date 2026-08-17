import { Fehlertext } from "../../components/Fehlertext";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  holeSetupModule,
  markiereAlsEingerichtet,
  setupAusfuehren,
  setupLogoHochladen,
  type SetupModul,
} from "../../api/setup";
import { ApiError } from "../../api/client";
import { useConfig } from "../../context/ConfigContext";

const SCHRITTE = [
  "Organisation",
  "Logo",
  "Farben",
  "Admin-Passwort",
  "Fahrzeuge",
  "Module",
  "Benachrichtigungen",
  "Fehlerberichte",
] as const;

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
  const [fahrzeugName, setFahrzeugName] = useState("");
  const [fahrzeugNamen, setFahrzeugNamen] = useState<string[]>([]);
  const [moduleListe, setModuleListe] = useState<SetupModul[] | null>(null);
  const [moduleLadevorgang, setModuleLadevorgang] = useState(false);
  const [moduleAuswahl, setModuleAuswahl] = useState<Record<string, boolean>>({});
  const [emailAktiv, setEmailAktiv] = useState(false);
  const [emailSmtpHost, setEmailSmtpHost] = useState("");
  const [emailSmtpPort, setEmailSmtpPort] = useState(587);
  const [emailSmtpUser, setEmailSmtpUser] = useState("");
  const [emailSmtpPasswort, setEmailSmtpPasswort] = useState("");
  const [emailSmtpTls, setEmailSmtpTls] = useState(true);
  const [emailVon, setEmailVon] = useState("");
  const [emailEmpfaenger, setEmailEmpfaenger] = useState("");
  const [pushAktiv, setPushAktiv] = useState(false);
  const [fehlerberichteAktiv, setFehlerberichteAktiv] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [wirdAbgeschlossen, setWirdAbgeschlossen] = useState(false);

  const MODULE_SCHRITT = SCHRITTE.indexOf("Module");

  useEffect(() => {
    if (schritt !== MODULE_SCHRITT || moduleListe !== null) return;
    setModuleLadevorgang(true);
    holeSetupModule()
      .then((module) => {
        setModuleListe(module);
        setModuleAuswahl(Object.fromEntries(module.map((m) => [m.key, m.aktiv])));
      })
      .catch(() => setFehler("Module konnten nicht geladen werden."))
      .finally(() => setModuleLadevorgang(false));
  }, [schritt, moduleListe, MODULE_SCHRITT]);

  function fahrzeugHinzufuegen() {
    const name = fahrzeugName.trim();
    if (!name || fahrzeugNamen.includes(name)) return;
    setFahrzeugNamen((namen) => [...namen, name]);
    setFahrzeugName("");
  }

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
        fahrzeuge: fahrzeugNamen.map((name) => ({ name })),
        module_aktiv: moduleAuswahl,
        notifier:
          emailAktiv || pushAktiv
            ? {
                email_aktiv: emailAktiv,
                email_smtp_host: emailSmtpHost,
                email_smtp_port: emailSmtpPort,
                email_smtp_user: emailSmtpUser,
                email_smtp_password: emailSmtpPasswort,
                email_smtp_use_tls: emailSmtpTls,
                email_from: emailVon,
                email_recipients: emailEmpfaenger,
                push_aktiv: pushAktiv,
              }
            : undefined,
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
            {logoUrl && (
              <img
                src={logoUrl}
                alt="Hochgeladenes Logo"
                style={{
                  height: 60,
                  width: "auto",
                  maxWidth: "100%",
                  objectFit: "contain",
                  alignSelf: "flex-start",
                  marginTop: 12,
                }}
              />
            )}
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
                <Fehlertext>Die Passwörter stimmen nicht überein.</Fehlertext>
              )}
            </div>
          </>
        )}

        {schritt === 4 && (
          <>
            <p>
              Lege optional die ersten Fahrzeuge an (nur Name). Weitere Angaben wie Sitzplätze
              lassen sich später im Modul „Fahrzeuge" ergänzen. Dieser Schritt kann übersprungen
              werden.
            </p>
            <div className="formular-feld" style={{ display: "flex", gap: 8 }}>
              <input
                value={fahrzeugName}
                onChange={(e) => setFahrzeugName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    fahrzeugHinzufuegen();
                  }
                }}
                placeholder="z. B. HLF 20"
              />
              <button type="button" className="sekundaer" onClick={fahrzeugHinzufuegen}>
                Hinzufügen
              </button>
            </div>
            {fahrzeugNamen.length > 0 && (
              <ul>
                {fahrzeugNamen.map((name) => (
                  <li key={name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {name}
                    <button
                      type="button"
                      className="sekundaer"
                      onClick={() => setFahrzeugNamen((namen) => namen.filter((n) => n !== name))}
                    >
                      Entfernen
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {schritt === 5 && (
          <>
            <p>Wähle, welche Module direkt aktiv sein sollen. Weitere Module lassen sich jederzeit unter „Module" nachträglich aktivieren.</p>
            {moduleLadevorgang && <p>Module werden geladen …</p>}
            {moduleListe?.map((modul) => (
              <div className="formular-feld" key={modul.key}>
                <label>
                  <input
                    type="checkbox"
                    checked={Boolean(moduleAuswahl[modul.key])}
                    onChange={(e) =>
                      setModuleAuswahl((auswahl) => ({ ...auswahl, [modul.key]: e.target.checked }))
                    }
                  />{" "}
                  {modul.name}
                </label>
              </div>
            ))}
          </>
        )}

        {schritt === 6 && (
          <>
            <p>Optional: Basis-Benachrichtigungskonfiguration. Details und weitere Kanäle lassen sich später unter „Benachrichtigungen" ergänzen.</p>
            <div className="formular-feld">
              <label>
                <input
                  type="checkbox"
                  checked={emailAktiv}
                  onChange={(e) => setEmailAktiv(e.target.checked)}
                />{" "}
                E-Mail-Benachrichtigungen aktivieren
              </label>
            </div>
            {emailAktiv && (
              <>
                <div className="formular-feld">
                  <label htmlFor="notifier-smtp-host">SMTP-Server</label>
                  <input
                    id="notifier-smtp-host"
                    value={emailSmtpHost}
                    onChange={(e) => setEmailSmtpHost(e.target.value)}
                    placeholder="smtp.gmail.com"
                  />
                </div>
                <div className="formular-feld">
                  <label htmlFor="notifier-smtp-port">SMTP-Port</label>
                  <input
                    id="notifier-smtp-port"
                    type="number"
                    value={emailSmtpPort}
                    onChange={(e) => setEmailSmtpPort(Number(e.target.value))}
                  />
                </div>
                <div className="formular-feld">
                  <label>
                    <input
                      type="checkbox"
                      checked={emailSmtpTls}
                      onChange={(e) => setEmailSmtpTls(e.target.checked)}
                    />{" "}
                    STARTTLS verwenden
                  </label>
                </div>
                <div className="formular-feld">
                  <label htmlFor="notifier-smtp-user">Benutzername</label>
                  <input
                    id="notifier-smtp-user"
                    value={emailSmtpUser}
                    onChange={(e) => setEmailSmtpUser(e.target.value)}
                  />
                </div>
                <div className="formular-feld">
                  <label htmlFor="notifier-smtp-passwort">Passwort</label>
                  <input
                    id="notifier-smtp-passwort"
                    type="password"
                    value={emailSmtpPasswort}
                    onChange={(e) => setEmailSmtpPasswort(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
                <div className="formular-feld">
                  <label htmlFor="notifier-email-von">Absenderadresse</label>
                  <input
                    id="notifier-email-von"
                    type="email"
                    value={emailVon}
                    onChange={(e) => setEmailVon(e.target.value)}
                    placeholder="notifications@example.com"
                  />
                </div>
                <div className="formular-feld">
                  <label htmlFor="notifier-email-empfaenger">Empfängeradressen</label>
                  <input
                    id="notifier-email-empfaenger"
                    value={emailEmpfaenger}
                    onChange={(e) => setEmailEmpfaenger(e.target.value)}
                    placeholder="moderator@example.com"
                  />
                </div>
              </>
            )}
            <div className="formular-feld">
              <label>
                <input
                  type="checkbox"
                  checked={pushAktiv}
                  onChange={(e) => setPushAktiv(e.target.checked)}
                />{" "}
                Web-Push aktivieren (Schlüssel werden automatisch erzeugt)
              </label>
            </div>
          </>
        )}

        {schritt === 7 && (
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
                sonstigen Inhalte. Jederzeit änderbar unter Gruppenführer → Einstellungen.
              </span>
            </label>
          </>
        )}
      </div>

      {fehler && <Fehlertext>{fehler}</Fehlertext>}

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
