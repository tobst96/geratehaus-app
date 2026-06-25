import { useEffect, useState, type FormEvent } from "react";
import {
  holeEinstellungen,
  schreibeEinstellungen,
  ladeLogoHoch,
  fuehreArchivierungAus,
  einstellungenVerifizieren,
  holeModeratoren,
  moderatorAnlegen,
  moderatorPasswortAendern,
  moderatorLoeschen,
  type ModeratorKonto,
} from "../../api/moderator";
import { setupErneutAusfuehren } from "../../api/setup";
import { ApiError } from "../../api/client";
import { useConfig } from "../../context/ConfigContext";

function ModeratorenVerwaltung() {
  const [liste, setListe] = useState<ModeratorKonto[] | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [neuerUsername, setNeuerUsername] = useState("");
  const [neuesPasswort, setNeuesPasswort] = useState("");

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
      await moderatorAnlegen(neuerUsername.trim(), neuesPasswort);
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
      <h2>Moderator-Zugänge</h2>
      {fehler && <p className="fehlertext">{fehler}</p>}
      {!liste && <p>Lädt …</p>}
      {liste && (
        <table>
          <thead>
            <tr>
              <th>Benutzername</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {liste.map((m) => (
              <tr key={m.id}>
                <td>{m.username}</td>
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
        <button type="submit">Zugang anlegen</button>
      </form>
    </div>
  );
}

function EinstellungenPasswortGate({ onEntsperrt }: { onEntsperrt: () => void }) {
  const [passwort, setPasswort] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);

  async function absenden(e: FormEvent) {
    e.preventDefault();
    setLaeuft(true);
    setFehler(null);
    try {
      await einstellungenVerifizieren(passwort);
      onEntsperrt();
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Passwort falsch.");
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <div>
      <h1>Einstellungen</h1>
      <div className="karte" style={{ maxWidth: 420 }}>
        <h2>Admin-Passwort erforderlich</h2>
        <p style={{ color: "#666", fontSize: "0.9rem" }}>
          Die Einstellungen enthalten sensible Daten (z. B. den Divera API-Key) und sind daher
          zusätzlich geschützt. Bitte erneut dein Moderator-Passwort eingeben.
        </p>
        <form onSubmit={absenden}>
          <label htmlFor="e-gate-passwort">Passwort</label>
          <input
            id="e-gate-passwort"
            type="password"
            value={passwort}
            onChange={(ev) => setPasswort(ev.target.value)}
            autoFocus
            required
          />
          <br />
          <br />
          {fehler && <p className="fehlertext">{fehler}</p>}
          <button type="submit" disabled={laeuft || !passwort}>
            {laeuft ? "Prüfe …" : "Entsperren"}
          </button>
        </form>
      </div>
    </div>
  );
}

export function Einstellungen() {
  const { neuLaden } = useConfig();
  const [entsperrt, setEntsperrt] = useState(false);
  const [geladen, setGeladen] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [gespeichert, setGespeichert] = useState(false);

  const [organisationName, setOrganisationName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [farbePrimaer, setFarbePrimaer] = useState("#FFA633");
  const [farbeAkzent, setFarbeAkzent] = useState("#1A1A1A");

  const [modulEinsatztagebuch, setModulEinsatztagebuch] = useState(true);
  const [modulDienstbuch, setModulDienstbuch] = useState(true);
  const [modulDienststunden, setModulDienststunden] = useState(true);
  const [modulFahrzeugbuchung, setModulFahrzeugbuchung] = useState(true);

  const [modulEinsatztagebuchStartseite, setModulEinsatztagebuchStartseite] = useState(true);
  const [modulDienstbuchStartseite, setModulDienstbuchStartseite] = useState(true);
  const [modulDienststundenStartseite, setModulDienststundenStartseite] = useState(true);
  const [modulFahrzeugbuchungStartseite, setModulFahrzeugbuchungStartseite] = useState(false);

  const [dienstbuchZeitfenster, setDienstbuchZeitfenster] = useState(12);
  const [archivierungszeitraum, setArchivierungszeitraum] = useState(2);
  const [einsatzCountdownMinuten, setEinsatzCountdownMinuten] = useState(30);
  const [alleEingetragenMinuten, setAlleEingetragenMinuten] = useState(30);
  const [autoabschlussStunde, setAutoabschlussStunde] = useState(4);
  const [autoabschlussInaktivitaetStunden, setAutoabschlussInaktivitaetStunden] = useState(4);
  const [barcodeGueltigkeitTage, setBarcodeGueltigkeitTage] = useState(730);

  const [diveraAktiv, setDiveraAktiv] = useState(false);
  const [diveraApiKey, setDiveraApiKey] = useState("");
  const [diveraModus, setDiveraModus] = useState("polling");

  const [benachrichtigungEinsatz, setBenachrichtigungEinsatz] = useState(true);
  const [benachrichtigungDienstbuch, setBenachrichtigungDienstbuch] = useState(true);
  const [benachrichtigungBuchung, setBenachrichtigungBuchung] = useState(true);
  const [benachrichtigungSchwellenwert, setBenachrichtigungSchwellenwert] = useState(true);

  async function laden() {
    try {
      const w = await holeEinstellungen();
      setOrganisationName(String(w.organisation_name ?? ""));
      setLogoUrl(String(w.logo_url ?? ""));
      setFarbePrimaer(String(w.farbe_primaer ?? "#FFA633"));
      setFarbeAkzent(String(w.farbe_akzent ?? "#1A1A1A"));
      setModulEinsatztagebuch(Boolean(w.modul_einsatztagebuch_aktiv));
      setModulDienstbuch(Boolean(w.modul_dienstbuch_aktiv));
      setModulDienststunden(Boolean(w.modul_dienststunden_aktiv));
      setModulFahrzeugbuchung(Boolean(w.modul_fahrzeugbuchung_aktiv));
      setModulEinsatztagebuchStartseite(Boolean(w.modul_einsatztagebuch_startseite));
      setModulDienstbuchStartseite(Boolean(w.modul_dienstbuch_startseite));
      setModulDienststundenStartseite(Boolean(w.modul_dienststunden_startseite));
      setModulFahrzeugbuchungStartseite(Boolean(w.modul_fahrzeugbuchung_startseite));
      setDienstbuchZeitfenster(Number(w.dienstbuch_zeitfenster_stunden ?? 12));
      setArchivierungszeitraum(Number(w.archivierungszeitraum_jahre ?? 2));
      setEinsatzCountdownMinuten(Number(w.einsatz_countdown_minuten ?? 30));
      setAlleEingetragenMinuten(Number(w.einsatz_alle_eingetragen_minuten ?? 30));
      setAutoabschlussStunde(Number(w.einsatz_autoabschluss_stunde ?? 4));
      setAutoabschlussInaktivitaetStunden(Number(w.einsatz_autoabschluss_inaktivitaet_stunden ?? 4));
      setBarcodeGueltigkeitTage(Number(w.barcode_gueltigkeit_tage ?? 730));
      setDiveraAktiv(Boolean(w.divera_aktiv));
      setDiveraApiKey(String(w.divera_api_key ?? ""));
      setDiveraModus(String(w.divera_modus ?? "polling"));
      setBenachrichtigungEinsatz(Boolean(w.benachrichtigung_neuer_einsatz));
      setBenachrichtigungDienstbuch(Boolean(w.benachrichtigung_neues_dienstbuch));
      setBenachrichtigungBuchung(Boolean(w.benachrichtigung_buchungsanfrage));
      setBenachrichtigungSchwellenwert(Boolean(w.benachrichtigung_schwellenwert_ueberschreitung));
      setGeladen(true);
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Einstellungen konnten nicht geladen werden.");
    }
  }

  useEffect(() => {
    if (entsperrt) laden();
  }, [entsperrt]);

  async function speichern(e: FormEvent) {
    e.preventDefault();
    setFehler(null);
    setGespeichert(false);
    try {
      await schreibeEinstellungen({
        organisation_name: organisationName,
        farbe_primaer: farbePrimaer,
        farbe_akzent: farbeAkzent,
        modul_einsatztagebuch_aktiv: modulEinsatztagebuch,
        modul_dienstbuch_aktiv: modulDienstbuch,
        modul_dienststunden_aktiv: modulDienststunden,
        modul_fahrzeugbuchung_aktiv: modulFahrzeugbuchung,
        modul_einsatztagebuch_startseite: modulEinsatztagebuchStartseite,
        modul_dienstbuch_startseite: modulDienstbuchStartseite,
        modul_dienststunden_startseite: modulDienststundenStartseite,
        modul_fahrzeugbuchung_startseite: modulFahrzeugbuchungStartseite,
        dienstbuch_zeitfenster_stunden: dienstbuchZeitfenster,
        archivierungszeitraum_jahre: archivierungszeitraum,
        einsatz_countdown_minuten: einsatzCountdownMinuten,
        einsatz_alle_eingetragen_minuten: alleEingetragenMinuten,
        einsatz_autoabschluss_stunde: autoabschlussStunde,
        einsatz_autoabschluss_inaktivitaet_stunden: autoabschlussInaktivitaetStunden,
        barcode_gueltigkeit_tage: barcodeGueltigkeitTage,
        divera_aktiv: diveraAktiv,
        divera_api_key: diveraApiKey,
        divera_modus: diveraModus,
        benachrichtigung_neuer_einsatz: benachrichtigungEinsatz,
        benachrichtigung_neues_dienstbuch: benachrichtigungDienstbuch,
        benachrichtigung_buchungsanfrage: benachrichtigungBuchung,
        benachrichtigung_schwellenwert_ueberschreitung: benachrichtigungSchwellenwert,
      });
      neuLaden();
      setGespeichert(true);
      setTimeout(() => setGespeichert(false), 4000);
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Einstellungen konnten nicht gespeichert werden.");
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

  if (!entsperrt) {
    return <EinstellungenPasswortGate onEntsperrt={() => setEntsperrt(true)} />;
  }

  if (!geladen && !fehler) return <p>Lädt …</p>;

  return (
    <div>
      <h1>Einstellungen</h1>
      {fehler && <p className="fehlertext">{fehler}</p>}
      {gespeichert && (
        <p
          style={{
            background: "#e6f7ec",
            color: "#1a7a3a",
            padding: "0.6rem 1rem",
            borderRadius: "var(--radius)",
            fontWeight: 600,
          }}
        >
          ✓ Einstellungen erfolgreich gespeichert
        </p>
      )}

      <form onSubmit={speichern}>
        <div className="karte">
          <h2>Organisation &amp; Branding</h2>
          <label htmlFor="e-org">Name der Organisation</label>
          <input id="e-org" value={organisationName} onChange={(e) => setOrganisationName(e.target.value)} />
          <br />
          <br />
          <label htmlFor="e-logo">Logo</label>
          <br />
          {logoUrl && <img src={logoUrl} alt="Logo" style={{ height: 50, marginBottom: 8 }} />}
          <br />
          <input
            id="e-logo"
            type="file"
            accept="image/png,image/svg+xml"
            onChange={(e) => e.target.files?.[0] && logoHochladen(e.target.files[0])}
          />
          <br />
          <br />
          <label htmlFor="e-farbe-primaer">Primärfarbe</label>
          <input id="e-farbe-primaer" type="color" value={farbePrimaer} onChange={(e) => setFarbePrimaer(e.target.value)} />
          <br />
          <br />
          <label htmlFor="e-farbe-akzent">Akzentfarbe</label>
          <input id="e-farbe-akzent" type="color" value={farbeAkzent} onChange={(e) => setFarbeAkzent(e.target.value)} />
        </div>

        <div className="karte">
          <h2>Module</h2>
          <p style={{ fontSize: "0.85rem", color: "#666" }}>
            "Aktiv" steuert, ob das Modul überhaupt erreichbar ist. "Auf Startseite anzeigen" steuert,
            ob dafür eine Kachel im Gerätehaus-Kiosk erscheint.
          </p>
          <table>
            <thead>
              <tr>
                <th>Modul</th>
                <th>Aktiv</th>
                <th>Auf Startseite anzeigen</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Einsatztagebuch</td>
                <td>
                  <input
                    type="checkbox"
                    checked={modulEinsatztagebuch}
                    onChange={(e) => setModulEinsatztagebuch(e.target.checked)}
                  />
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={modulEinsatztagebuchStartseite}
                    onChange={(e) => setModulEinsatztagebuchStartseite(e.target.checked)}
                  />
                </td>
              </tr>
              <tr>
                <td>Dienstbuch</td>
                <td>
                  <input
                    type="checkbox"
                    checked={modulDienstbuch}
                    onChange={(e) => setModulDienstbuch(e.target.checked)}
                  />
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={modulDienstbuchStartseite}
                    onChange={(e) => setModulDienstbuchStartseite(e.target.checked)}
                  />
                </td>
              </tr>
              <tr>
                <td>Dienststunden</td>
                <td>
                  <input
                    type="checkbox"
                    checked={modulDienststunden}
                    onChange={(e) => setModulDienststunden(e.target.checked)}
                  />
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={modulDienststundenStartseite}
                    onChange={(e) => setModulDienststundenStartseite(e.target.checked)}
                  />
                </td>
              </tr>
              <tr>
                <td>Fahrzeugbuchung</td>
                <td>
                  <input
                    type="checkbox"
                    checked={modulFahrzeugbuchung}
                    onChange={(e) => setModulFahrzeugbuchung(e.target.checked)}
                  />
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={modulFahrzeugbuchungStartseite}
                    onChange={(e) => setModulFahrzeugbuchungStartseite(e.target.checked)}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="karte">
          <h2>Zeitfenster &amp; Schwellenwerte</h2>
          <label htmlFor="e-zeitfenster">Dienstbuch-Zeitfenster (Stunden)</label>
          <input
            id="e-zeitfenster"
            type="number"
            min={1}
            value={dienstbuchZeitfenster}
            onChange={(e) => setDienstbuchZeitfenster(Number(e.target.value))}
          />
          <br />
          <br />
          <label htmlFor="e-archiv">Archivierungszeitraum (Jahre)</label>
          <input
            id="e-archiv"
            type="number"
            min={1}
            value={archivierungszeitraum}
            onChange={(e) => setArchivierungszeitraum(Number(e.target.value))}
          />
          <br />
          <br />
          <label htmlFor="e-countdown">Einsatz-Countdown im Gerätehaus (Minuten)</label>
          <input
            id="e-countdown"
            type="number"
            min={1}
            value={einsatzCountdownMinuten}
            onChange={(e) => setEinsatzCountdownMinuten(Number(e.target.value))}
          />
          <br />
          <br />
          <label htmlFor="e-alle-eingetragen">
            Verzögerung nach "Alle eingetragen" bis zum automatischen Abschluss (Minuten)
          </label>
          <input
            id="e-alle-eingetragen"
            type="number"
            min={1}
            value={alleEingetragenMinuten}
            onChange={(e) => setAlleEingetragenMinuten(Number(e.target.value))}
          />
          <br />
          <br />
          <label htmlFor="e-autoabschluss-stunde">Automatischer Einsatzabschluss um (Uhrzeit, Stunde 0–23)</label>
          <input
            id="e-autoabschluss-stunde"
            type="number"
            min={0}
            max={23}
            value={autoabschlussStunde}
            onChange={(e) => setAutoabschlussStunde(Number(e.target.value))}
          />
          <br />
          <br />
          <label htmlFor="e-autoabschluss-inaktivitaet">
            … wenn die letzte Bearbeitung länger als (Stunden) zurückliegt
          </label>
          <input
            id="e-autoabschluss-inaktivitaet"
            type="number"
            min={1}
            value={autoabschlussInaktivitaetStunden}
            onChange={(e) => setAutoabschlussInaktivitaetStunden(Number(e.target.value))}
          />
          <p style={{ fontSize: "0.85rem", color: "#666" }}>
            Offene Einsätze werden täglich zur eingestellten Stunde automatisch abgeschlossen,
            wenn seit der letzten Bearbeitung mindestens so viele Stunden vergangen sind.
          </p>
        </div>

        <div className="karte">
          <h2>Benachrichtigungen</h2>
          <label>
            <input
              type="checkbox"
              checked={benachrichtigungEinsatz}
              onChange={(e) => setBenachrichtigungEinsatz(e.target.checked)}
            />{" "}
            Einsatz abgeschlossen
          </label>
          <br />
          <label>
            <input
              type="checkbox"
              checked={benachrichtigungDienstbuch}
              onChange={(e) => setBenachrichtigungDienstbuch(e.target.checked)}
            />{" "}
            Neues Dienstbuch
          </label>
          <br />
          <label>
            <input
              type="checkbox"
              checked={benachrichtigungBuchung}
              onChange={(e) => setBenachrichtigungBuchung(e.target.checked)}
            />{" "}
            Neue Buchungsanfrage
          </label>
          <br />
          <label>
            <input
              type="checkbox"
              checked={benachrichtigungSchwellenwert}
              onChange={(e) => setBenachrichtigungSchwellenwert(e.target.checked)}
            />{" "}
            Schwellenwert-Überschreitung
          </label>
        </div>

        <div className="karte">
          <h2>Barcodes</h2>
          <label htmlFor="e-barcode-gueltigkeit">Gültigkeitsdauer neuer Barcodes (Tage)</label>
          <input
            id="e-barcode-gueltigkeit"
            type="number"
            min={1}
            value={barcodeGueltigkeitTage}
            onChange={(e) => setBarcodeGueltigkeitTage(Number(e.target.value))}
          />
          <p style={{ fontSize: "0.85rem", color: "#666" }}>
            Gilt nur für neu erzeugte Barcodes. Bereits ausgegebene Barcodes behalten ihr
            ursprüngliches Ablaufdatum.
          </p>
        </div>

        <div className="karte">
          <h2>Divera 24/7</h2>
          <p style={{ fontSize: "0.85rem", color: "#666" }}>
            Ersetzt die frühere .env-Konfiguration – Änderungen wirken ohne Neustart.
          </p>
          <label>
            <input type="checkbox" checked={diveraAktiv} onChange={(e) => setDiveraAktiv(e.target.checked)} />{" "}
            Divera-Anbindung aktiv
          </label>
          <br />
          <br />
          <label htmlFor="e-divera-modus">Modus</label>
          <select id="e-divera-modus" value={diveraModus} onChange={(e) => setDiveraModus(e.target.value)}>
            <option value="polling">Polling (alle 5 Minuten abfragen)</option>
            <option value="webhook">Webhook (Divera sendet aktiv)</option>
          </select>
          <br />
          <br />
          <label htmlFor="e-divera-key">API-Key / Accesskey</label>
          <input
            id="e-divera-key"
            type="password"
            value={diveraApiKey}
            onChange={(e) => setDiveraApiKey(e.target.value)}
            placeholder="Accesskey aus Divera"
            autoComplete="off"
          />
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
