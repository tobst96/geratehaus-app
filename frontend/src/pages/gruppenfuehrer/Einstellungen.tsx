import { Fehlertext } from "../../components/Fehlertext";
import { useEffect, useState, type FormEvent } from "react";
import {
  holeEinstellungen,
  schreibeEinstellungen,
  ladeLogoHoch,
  ladeLogoDarkHoch,
  fuehreArchivierungAus,
  holeZweiFaktorStatus,
  zweiFaktorAktivieren,
  zweiFaktorRecoveryNeu,
  zweiFaktorDeaktivieren,
  type ZweiFaktorStatus,
} from "../../api/gruppenfuehrer";
import { setupErneutAusfuehren } from "../../api/setup";
import { ApiError } from "../../api/client";
import { useConfig } from "../../context/ConfigContext";
import { useToast } from "../../context/ToastContext";
import { Banner } from "../../components/Banner";
import { Ladeanzeige } from "../../components/Ladeanzeige";

function ZweiFaktorVerwaltung() {
  const [status, setStatus] = useState<ZweiFaktorStatus | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);

  async function laden() {
    try {
      setStatus(await holeZweiFaktorStatus());
    } catch {
      /* nicht kritisch */
    }
  }

  useEffect(() => {
    laden();
  }, []);

  async function aktivieren() {
    setFehler(null);
    try {
      const { codes } = await zweiFaktorAktivieren();
      setCodes(codes);
      await laden();
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "2FA konnte nicht aktiviert werden.");
    }
  }

  async function deaktivieren() {
    if (!confirm("Zwei-Faktor-Authentisierung für deinen Zugang deaktivieren?")) return;
    setFehler(null);
    try {
      await zweiFaktorDeaktivieren();
      setCodes(null);
      await laden();
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "2FA konnte nicht deaktiviert werden.");
    }
  }

  async function recoveryNeu() {
    setFehler(null);
    try {
      const { codes } = await zweiFaktorRecoveryNeu();
      setCodes(codes);
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Codes konnten nicht erzeugt werden.");
    }
  }

  if (!status) return null;

  return (
    <div className="karte">
      <h2>Zwei-Faktor-Anmeldung (dein Zugang)</h2>
      <p className="hinweistext">
        Bei Aktivierung wird beim Login von einem neuen Gerät zusätzlich ein per E-Mail
        gesendeter Code abgefragt. Voraussetzung ist eine hinterlegte E-Mail-Adresse.
      </p>
      {fehler && <Fehlertext>{fehler}</Fehlertext>}
      {codes && (
        <div style={{ margin: "8px 0", padding: 12, border: "1px solid var(--farbe-rand)", borderRadius: 8 }}>
          <strong>Recovery-Codes – jetzt sicher notieren (werden nicht erneut angezeigt):</strong>
          <div style={{ fontFamily: "monospace", marginTop: 8, columns: 2 }}>
            {codes.map((c) => (
              <div key={c}>{c}</div>
            ))}
          </div>
        </div>
      )}
      {status.aktiv ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span style={{ color: "green", fontWeight: 600, alignSelf: "center" }}>✓ Aktiv</span>
          <button type="button" className="sekundaer" onClick={recoveryNeu}>
            Neue Recovery-Codes
          </button>
          <button type="button" className="sekundaer" onClick={deaktivieren}>
            Deaktivieren
          </button>
        </div>
      ) : !status.email_gesetzt ? (
        <Fehlertext>
          Für 2FA muss zuerst eine E-Mail für deinen Zugang hinterlegt werden (durch einen Admin).
        </Fehlertext>
      ) : (
        <button type="button" onClick={aktivieren}>
          Zwei-Faktor-Anmeldung aktivieren
        </button>
      )}
    </div>
  );
}

export function Einstellungen() {
  const { neuLaden } = useConfig();
  const toast = useToast();
  const [geladen, setGeladen] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [gespeichert, setGespeichert] = useState(false);

  const [organisationName, setOrganisationName] = useState("");
  const [oeffentlicheBasisUrl, setOeffentlicheBasisUrl] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoDarkUrl, setLogoDarkUrl] = useState("");
  const [farbePrimaer, setFarbePrimaer] = useState("#FFA633");
  const [farbeAkzent, setFarbeAkzent] = useState("#1A1A1A");

  const [archivierungszeitraum, setArchivierungszeitraum] = useState(2);


  const [fehlerberichteAktiv, setFehlerberichteAktiv] = useState(false);


  async function laden() {
    try {
      const w = await holeEinstellungen();
      setOrganisationName(String(w.organisation_name ?? ""));
      setOeffentlicheBasisUrl(String(w.oeffentliche_basis_url ?? ""));
      setLogoUrl(String(w.logo_url ?? ""));
      setLogoDarkUrl(String(w.logo_url_dark ?? ""));
      setFarbePrimaer(String(w.farbe_primaer ?? "#FFA633"));
      setFarbeAkzent(String(w.farbe_akzent ?? "#1A1A1A"));
      setArchivierungszeitraum(Number(w.archivierungszeitraum_jahre ?? 2));
      setFehlerberichteAktiv(Boolean(w.fehlerberichte_aktiv));
      setGeladen(true);
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Einstellungen konnten nicht geladen werden.");
    }
  }

  useEffect(() => {
    laden();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function speichern(e: FormEvent) {
    e.preventDefault();
    setFehler(null);
    setGespeichert(false);
    try {
      await schreibeEinstellungen({
        organisation_name: organisationName,
        oeffentliche_basis_url: oeffentlicheBasisUrl,
        farbe_primaer: farbePrimaer,
        farbe_akzent: farbeAkzent,
        archivierungszeitraum_jahre: archivierungszeitraum,
        fehlerberichte_aktiv: fehlerberichteAktiv,
      });
      neuLaden();
      setGespeichert(true);
      setTimeout(() => setGespeichert(false), 4000);
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Einstellungen konnten nicht gespeichert werden.");
    }
  }

  async function logoDarkHochladen(datei: File) {
    try {
      const { logo_url_dark } = await ladeLogoDarkHoch(datei);
      setLogoDarkUrl(logo_url_dark);
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Logo-Upload fehlgeschlagen.");
    }
  }

  async function logoHochladen(datei: File) {
    try {
      const { logo_url } = await ladeLogoHoch(datei);
      setLogoUrl(logo_url);
      neuLaden();
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Logo-Upload fehlgeschlagen.");
    }
  }

  async function archivierungJetzt() {
    try {
      const ergebnis = await fuehreArchivierungAus();
      setGespeichert(false);
      setFehler(null);
      toast.erfolg(
        `Archiviert: ${ergebnis.einsaetze} Einsätze, ${ergebnis.dienstbuecher} Dienstbücher.`
      );
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Archivierung fehlgeschlagen.");
    }
  }

  async function setupErneut() {
    if (
      !confirm(
        "Den Setup-Wizard mit den aktuellen Werten erneut ausführen? Admin-Passwort und Grunddaten werden überschrieben."
      )
    ) {
      return;
    }
    try {
      await setupErneutAusfuehren({
        organisation_name: organisationName,
        farbe_primaer: farbePrimaer,
        farbe_akzent: farbeAkzent,
        admin_passwort: prompt("Neues Admin-Passwort (mind. 8 Zeichen):") ?? "",
      });
      neuLaden();
      toast.erfolg("Setup erneut durchgeführt.");
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Setup fehlgeschlagen.");
    }
  }

  if (!geladen && !fehler) return <Ladeanzeige />;

  return (
    <div>
      <h1>Einstellungen</h1>
      {fehler && <Fehlertext>{fehler}</Fehlertext>}
      {gespeichert && <Banner art="erfolg">Einstellungen erfolgreich gespeichert</Banner>}

      <form onSubmit={speichern}>
        <div className="karte">
          <h2>Organisation &amp; Branding</h2>
          <div className="formular-feld">
            <label htmlFor="e-org">Name der Organisation</label>
            <input id="e-org" value={organisationName} onChange={(e) => setOrganisationName(e.target.value)} />
          </div>
          <div className="formular-feld">
            <label htmlFor="e-basis-url">Öffentliche Adresse (für QR-Codes)</label>
            <input
              id="e-basis-url"
              value={oeffentlicheBasisUrl}
              onChange={(e) => setOeffentlicheBasisUrl(e.target.value)}
              placeholder="https://geraetehausapp.feuerwehr-musterstadt.de"
            />
            <p className="hinweistext">
              Wird für alle QR-Code-Links genutzt (Barcode vergessen, Profilbild-Upload usw.), statt der
              aktuellen Browser-Adresse – wichtig, falls das Gerätehaus-Tablet unter einer anderen Adresse
              erreichbar ist als das Internet.
            </p>
          </div>
          <div className="formular-feld">
            <label htmlFor="e-logo">Logo</label>
            {logoUrl && (
              <img
                src={logoUrl}
                alt="Logo"
                style={{
                  height: 50,
                  width: "auto",
                  maxWidth: "100%",
                  objectFit: "contain",
                  alignSelf: "flex-start",
                  marginBottom: 8,
                }}
              />
            )}
            <input
              id="e-logo"
              type="file"
              accept="image/png,image/svg+xml"
              onChange={(e) => e.target.files?.[0] && logoHochladen(e.target.files[0])}
            />
          </div>
          <div className="formular-feld">
            <label htmlFor="e-logo-dark">Logo für Dark Mode (optional)</label>
            {logoDarkUrl && (
              <img
                src={logoDarkUrl}
                alt="Logo (Dark Mode)"
                style={{
                  height: 50,
                  width: "auto",
                  maxWidth: "100%",
                  objectFit: "contain",
                  alignSelf: "flex-start",
                  marginBottom: 8,
                  background: "#1a1a1a",
                  padding: 4,
                  borderRadius: 6,
                }}
              />
            )}
            <input
              id="e-logo-dark"
              type="file"
              accept="image/png,image/svg+xml"
              onChange={(e) => e.target.files?.[0] && logoDarkHochladen(e.target.files[0])}
            />
            <p style={{ fontSize: "0.8rem", color: "var(--farbe-text-mute)", margin: "4px 0 0" }}>
              Wird im dunklen Design statt des Standard-Logos angezeigt.
            </p>
          </div>
          <div className="formular-zeile">
            <div className="formular-feld">
              <label htmlFor="e-farbe-primaer">Primärfarbe</label>
              <input id="e-farbe-primaer" type="color" value={farbePrimaer} onChange={(e) => setFarbePrimaer(e.target.value)} />
            </div>
            <div className="formular-feld">
              <label htmlFor="e-farbe-akzent">Akzentfarbe</label>
              <input id="e-farbe-akzent" type="color" value={farbeAkzent} onChange={(e) => setFarbeAkzent(e.target.value)} />
            </div>
          </div>
        </div>


        <div className="karte">
          <h2>Archivierung</h2>
          <div className="formular-feld">
            <label htmlFor="e-archiv">Archivierungszeitraum (Jahre)</label>
            <input
              id="e-archiv"
              type="number"
              min={1}
              value={archivierungszeitraum}
              onChange={(e) => setArchivierungszeitraum(Number(e.target.value))}
            />
          </div>
        </div>


        <div className="karte">
          <h2>Fehlerberichte</h2>
          <label>
            <input
              type="checkbox"
              checked={fehlerberichteAktiv}
              onChange={(e) => setFehlerberichteAktiv(e.target.checked)}
            />{" "}
            Technische Fehlerberichte an den Entwickler senden
          </label>
          <p className="hinweistext">
            Hilft, Bugs über alle Installationen von Gerätehaus.app hinweg schneller zu finden und
            zu beheben. Es werden nur Stacktraces und technische Fehlerdetails übertragen, keine
            Namen oder sonstigen Inhalte. Wirkt erst nach einem Neustart des Backend-Containers.
          </p>
        </div>

        <button type="submit">Speichern</button>
      </form>

      <ZweiFaktorVerwaltung />

      <div className="karte" style={{ marginTop: 24 }}>
        <h2>Wartung</h2>
        <button type="button" className="sekundaer" onClick={archivierungJetzt}>
          Archivierung jetzt ausführen
        </button>{" "}
        <button type="button" className="sekundaer" onClick={setupErneut}>
          Setup-Wizard erneut ausführen
        </button>
      </div>
    </div>
  );
}
