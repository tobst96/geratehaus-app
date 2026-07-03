import { useEffect, useState, type FormEvent } from "react";
import {
  holeEinstellungen,
  schreibeEinstellungen,
  ladeLogoHoch,
  ladeLogoDarkHoch,
  fuehreArchivierungAus,
  holeModeratoren,
  moderatorAnlegen,
  moderatorPasswortAendern,
  moderatorLoeschen,
  type ModeratorKonto,
} from "../../api/moderator";
import { setupErneutAusfuehren } from "../../api/setup";
import { ApiError } from "../../api/client";
import { useConfig } from "../../context/ConfigContext";
import { Banner } from "../../components/Banner";
import { Ladeanzeige } from "../../components/Ladeanzeige";

function ModeratorenVerwaltung() {
  const [liste, setListe] = useState<ModeratorKonto[] | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [neuerUsername, setNeuerUsername] = useState("");
  const [neuesPasswort, setNeuesPasswort] = useState("");
  const [neueRolle, setNeueRolle] = useState("gruppenfuehrer");

  async function laden() {
    try {
      setListe(await holeModeratoren());
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Moderatoren konnten nicht geladen werden.");
    }
  }

  useEffect(() => {
    laden();
  }, []);

  async function anlegen(e: FormEvent) {
    e.preventDefault();
    setFehler(null);
    if (!neuerUsername.trim() || neuesPasswort.length < 8) {
      setFehler("Benutzername erforderlich, Passwort mindestens 8 Zeichen.");
      return;
    }
    try {
      await moderatorAnlegen(neuerUsername.trim(), neuesPasswort, neueRolle);
      setNeuerUsername("");
      setNeuesPasswort("");
      await laden();
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Anlegen fehlgeschlagen.");
    }
  }

  async function passwortAendern(m: ModeratorKonto) {
    const neues = prompt(`Neues Passwort für ${m.username} (mind. 8 Zeichen):`);
    if (!neues) return;
    try {
      await moderatorPasswortAendern(m.id, neues);
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Passwort konnte nicht geändert werden.");
    }
  }

  async function loeschen(m: ModeratorKonto) {
    if (!confirm(`Zugang "${m.username}" wirklich löschen?`)) return;
    try {
      await moderatorLoeschen(m.id);
      await laden();
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Löschen fehlgeschlagen.");
    }
  }

  return (
    <div className="karte">
      <h2>Admin- &amp; Gruppenführer-Zugänge</h2>
      <p style={{ fontSize: "0.85rem", color: "var(--farbe-text-mute)" }}>
        Admins sehen Personal, Stammdaten und alle Einstellungen. Gruppenführer sehen nur
        Dashboard, Listen (Einsatzberichte/Dienstbucheinträge) und Buchungen (Fahrzeugreservierungen).
      </p>
      {fehler && <p className="fehlertext">{fehler}</p>}
      {!liste && <Ladeanzeige />}
      {liste && (
        <div className="tabelle-scroll">
        <table>
          <thead>
            <tr>
              <th>Benutzername</th>
              <th>Rolle</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {liste.map((m) => (
              <tr key={m.id}>
                <td>{m.username}</td>
                <td>{m.rolle === "admin" ? "Admin" : "Gruppenführer"}</td>
                <td style={{ display: "flex", gap: 8 }}>
                  <button type="button" className="sekundaer" onClick={() => passwortAendern(m)}>
                    Passwort ändern
                  </button>
                  <button type="button" className="sekundaer" onClick={() => loeschen(m)}>
                    Löschen
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}

      <form onSubmit={anlegen} style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          placeholder="Neuer Benutzername"
          value={neuerUsername}
          onChange={(e) => setNeuerUsername(e.target.value)}
        />
        <input
          type="password"
          placeholder="Passwort (mind. 8 Zeichen)"
          value={neuesPasswort}
          onChange={(e) => setNeuesPasswort(e.target.value)}
          autoComplete="off"
        />
        <select value={neueRolle} onChange={(e) => setNeueRolle(e.target.value)}>
          <option value="gruppenfuehrer">Gruppenführer</option>
          <option value="admin">Admin</option>
        </select>
        <button type="submit">Zugang anlegen</button>
      </form>
    </div>
  );
}

export function Einstellungen() {
  const { neuLaden } = useConfig();
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
      alert(
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
      alert("Setup erneut durchgeführt.");
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Setup fehlgeschlagen.");
    }
  }

  if (!geladen && !fehler) return <Ladeanzeige />;

  return (
    <div>
      <h1>Einstellungen</h1>
      {fehler && <p className="fehlertext">{fehler}</p>}
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
            <p style={{ fontSize: "0.85rem", color: "var(--farbe-text-mute)" }}>
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
          <p style={{ fontSize: "0.85rem", color: "var(--farbe-text-mute)" }}>
            Hilft, Bugs über alle Installationen von Gerätehaus.app hinweg schneller zu finden und
            zu beheben. Es werden nur Stacktraces und technische Fehlerdetails übertragen, keine
            Namen oder sonstigen Inhalte. Wirkt erst nach einem Neustart des Backend-Containers.
          </p>
        </div>

        <button type="submit">Speichern</button>
      </form>

      <ModeratorenVerwaltung />

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
