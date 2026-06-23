import { useEffect, useState, type FormEvent } from "react";
import {
  holeEinstellungen,
  schreibeEinstellungen,
  ladeLogoHoch,
  fuehreArchivierungAus,
} from "../../api/moderator";
import { setupErneutAusfuehren } from "../../api/setup";
import { ApiError } from "../../api/client";
import { useConfig } from "../../context/ConfigContext";
import { GeofencePicker } from "../../components/GeofencePicker";

export function Einstellungen() {
  const { neuLaden } = useConfig();
  const [geladen, setGeladen] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [gespeichert, setGespeichert] = useState(false);

  const [organisationName, setOrganisationName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [farbePrimaer, setFarbePrimaer] = useState("#CC0000");
  const [farbeAkzent, setFarbeAkzent] = useState("#000000");

  const [modulEinsatztagebuch, setModulEinsatztagebuch] = useState(true);
  const [modulDienstbuch, setModulDienstbuch] = useState(true);
  const [modulDienststunden, setModulDienststunden] = useState(true);
  const [modulFahrzeugbuchung, setModulFahrzeugbuchung] = useState(true);

  const [geofenceLat, setGeofenceLat] = useState(0);
  const [geofenceLon, setGeofenceLon] = useState(0);
  const [geofenceRadius, setGeofenceRadius] = useState(150);

  const [dienstbuchZeitfenster, setDienstbuchZeitfenster] = useState(12);
  const [archivierungszeitraum, setArchivierungszeitraum] = useState(2);
  const [pinLaenge, setPinLaenge] = useState(4);

  const [benachrichtigungEinsatz, setBenachrichtigungEinsatz] = useState(true);
  const [benachrichtigungDienstbuch, setBenachrichtigungDienstbuch] = useState(true);
  const [benachrichtigungBuchung, setBenachrichtigungBuchung] = useState(true);
  const [benachrichtigungSchwellenwert, setBenachrichtigungSchwellenwert] = useState(true);

  async function laden() {
    try {
      const w = await holeEinstellungen();
      setOrganisationName(String(w.organisation_name ?? ""));
      setLogoUrl(String(w.logo_url ?? ""));
      setFarbePrimaer(String(w.farbe_primaer ?? "#CC0000"));
      setFarbeAkzent(String(w.farbe_akzent ?? "#000000"));
      setModulEinsatztagebuch(Boolean(w.modul_einsatztagebuch_aktiv));
      setModulDienstbuch(Boolean(w.modul_dienstbuch_aktiv));
      setModulDienststunden(Boolean(w.modul_dienststunden_aktiv));
      setModulFahrzeugbuchung(Boolean(w.modul_fahrzeugbuchung_aktiv));
      setGeofenceLat(Number(w.geofence_lat ?? 0));
      setGeofenceLon(Number(w.geofence_lon ?? 0));
      setGeofenceRadius(Number(w.geofence_radius_meter ?? 150));
      setDienstbuchZeitfenster(Number(w.dienstbuch_zeitfenster_stunden ?? 12));
      setArchivierungszeitraum(Number(w.archivierungszeitraum_jahre ?? 2));
      setPinLaenge(Number(w.pin_laenge ?? 4));
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
    laden();
  }, []);

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
        geofence_lat: geofenceLat,
        geofence_lon: geofenceLon,
        geofence_radius_meter: geofenceRadius,
        dienstbuch_zeitfenster_stunden: dienstbuchZeitfenster,
        archivierungszeitraum_jahre: archivierungszeitraum,
        pin_laenge: pinLaenge,
        benachrichtigung_neuer_einsatz: benachrichtigungEinsatz,
        benachrichtigung_neues_dienstbuch: benachrichtigungDienstbuch,
        benachrichtigung_buchungsanfrage: benachrichtigungBuchung,
        benachrichtigung_schwellenwert_ueberschreitung: benachrichtigungSchwellenwert,
      });
      neuLaden();
      setGespeichert(true);
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
        geofence_lat: geofenceLat,
        geofence_lon: geofenceLon,
        geofence_radius_meter: geofenceRadius,
        admin_passwort: prompt("Neues Admin-Passwort (mind. 8 Zeichen):") ?? "",
      });
      neuLaden();
      alert("Setup erneut durchgeführt.");
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Setup fehlgeschlagen.");
    }
  }

  if (!geladen && !fehler) return <p>Lädt …</p>;

  return (
    <div>
      <h1>Einstellungen</h1>
      {fehler && <p className="fehlertext">{fehler}</p>}
      {gespeichert && <p>Gespeichert.</p>}

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
          <label>
            <input type="checkbox" checked={modulEinsatztagebuch} onChange={(e) => setModulEinsatztagebuch(e.target.checked)} />{" "}
            Einsatztagebuch
          </label>
          <br />
          <label>
            <input type="checkbox" checked={modulDienstbuch} onChange={(e) => setModulDienstbuch(e.target.checked)} />{" "}
            Dienstbuch
          </label>
          <br />
          <label>
            <input type="checkbox" checked={modulDienststunden} onChange={(e) => setModulDienststunden(e.target.checked)} />{" "}
            Dienststunden
          </label>
          <br />
          <label>
            <input
              type="checkbox"
              checked={modulFahrzeugbuchung}
              onChange={(e) => setModulFahrzeugbuchung(e.target.checked)}
            />{" "}
            Fahrzeugbuchung
          </label>
        </div>

        <div className="karte">
          <h2>Geofence</h2>
          <GeofencePicker
            lat={geofenceLat}
            lon={geofenceLon}
            radiusMeter={geofenceRadius}
            onChange={(lat, lon) => {
              setGeofenceLat(lat);
              setGeofenceLon(lon);
            }}
          />
          <label htmlFor="e-radius">Radius in Metern</label>
          <input
            id="e-radius"
            type="number"
            min={10}
            value={geofenceRadius}
            onChange={(e) => setGeofenceRadius(Number(e.target.value))}
          />
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
        </div>

        <div className="karte">
          <h2>Sicherheit</h2>
          <label htmlFor="e-pin">PIN-Länge</label>
          <input
            id="e-pin"
            type="number"
            min={4}
            max={10}
            value={pinLaenge}
            onChange={(e) => setPinLaenge(Number(e.target.value))}
          />
        </div>

        <div className="karte">
          <h2>Benachrichtigungen</h2>
          <label>
            <input
              type="checkbox"
              checked={benachrichtigungEinsatz}
              onChange={(e) => setBenachrichtigungEinsatz(e.target.checked)}
            />{" "}
            Neuer Einsatz
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

        <button type="submit">Speichern</button>
      </form>

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
