import { useEffect, useState, type FormEvent } from "react";
import {
  holeEinstellungen,
  schreibeEinstellungen,
  ladeLogoHoch,
  fuehreArchivierungAus,
  holeModeratoren,
  moderatorAnlegen,
  moderatorPasswortAendern,
  moderatorLoeschen,
  diveraEinsaetzeNachholen,
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
        Admins sehen Personal, Punkte, Stammdaten und alle Einstellungen. Gruppenführer sehen nur
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

  const [modulEinsatztagebuchAussenzugriff, setModulEinsatztagebuchAussenzugriff] = useState(false);
  const [modulDienstbuchAussenzugriff, setModulDienstbuchAussenzugriff] = useState(false);
  const [modulDienststundenAussenzugriff, setModulDienststundenAussenzugriff] = useState(false);
  const [modulFahrzeugbuchungAussenzugriff, setModulFahrzeugbuchungAussenzugriff] = useState(false);

  const [dienstbuchZeitfenster, setDienstbuchZeitfenster] = useState(12);
  const [dienstbuchAutoschlussStunde, setDienstbuchAutoschlussStunde] = useState(4);
  const [archivierungszeitraum, setArchivierungszeitraum] = useState(2);
  const [einsatzCountdownMinuten, setEinsatzCountdownMinuten] = useState(30);
  const [alleEingetragenMinuten, setAlleEingetragenMinuten] = useState(30);
  const [autoabschlussStunde, setAutoabschlussStunde] = useState(4);
  const [autoabschlussInaktivitaetStunden, setAutoabschlussInaktivitaetStunden] = useState(4);
  const [personenSortierung, setPersonenSortierung] = useState("nachname");
  const [personenInaktivitaetTage, setPersonenInaktivitaetTage] = useState(90);

  const [diveraAktiv, setDiveraAktiv] = useState(false);
  const [diveraApiKey, setDiveraApiKey] = useState("");
  const [diveraModus, setDiveraModus] = useState("polling");
  const [diveraLetzterSync, setDiveraLetzterSync] = useState("");
  const [diveraLetzterSyncAnzahl, setDiveraLetzterSyncAnzahl] = useState(0);
  const [diveraHolenLaeuft, setDiveraHolenLaeuft] = useState(false);
  const [diveraHolenErgebnis, setDiveraHolenErgebnis] = useState<string | null>(null);

  const [fehlerberichteAktiv, setFehlerberichteAktiv] = useState(false);

  const [benachrichtigungEinsatz, setBenachrichtigungEinsatz] = useState(true);
  const [benachrichtigungDiveraAlarm, setBenachrichtigungDiveraAlarm] = useState(true);
  const [benachrichtigungDienstbuch, setBenachrichtigungDienstbuch] = useState(true);
  const [benachrichtigungBuchung, setBenachrichtigungBuchung] = useState(true);
  const [benachrichtigungSchwellenwert, setBenachrichtigungSchwellenwert] = useState(true);
  const [benachrichtigungPersonInaktiv, setBenachrichtigungPersonInaktiv] = useState(true);

  async function laden() {
    try {
      const w = await holeEinstellungen();
      setOrganisationName(String(w.organisation_name ?? ""));
      setOeffentlicheBasisUrl(String(w.oeffentliche_basis_url ?? ""));
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
      setModulEinsatztagebuchAussenzugriff(Boolean(w.modul_einsatztagebuch_aussenzugriff));
      setModulDienstbuchAussenzugriff(Boolean(w.modul_dienstbuch_aussenzugriff));
      setModulDienststundenAussenzugriff(Boolean(w.modul_dienststunden_aussenzugriff));
      setModulFahrzeugbuchungAussenzugriff(Boolean(w.modul_fahrzeugbuchung_aussenzugriff));
      setDienstbuchZeitfenster(Number(w.dienstbuch_zeitfenster_stunden ?? 12));
      setDienstbuchAutoschlussStunde(Number(w.dienstbuch_autoschluss_stunde ?? 4));
      setArchivierungszeitraum(Number(w.archivierungszeitraum_jahre ?? 2));
      setEinsatzCountdownMinuten(Number(w.einsatz_countdown_minuten ?? 30));
      setAlleEingetragenMinuten(Number(w.einsatz_alle_eingetragen_minuten ?? 30));
      setAutoabschlussStunde(Number(w.einsatz_autoabschluss_stunde ?? 4));
      setAutoabschlussInaktivitaetStunden(Number(w.einsatz_autoabschluss_inaktivitaet_stunden ?? 4));
      setPersonenSortierung(String(w.personen_sortierung ?? "nachname"));
      setPersonenInaktivitaetTage(Number(w.personen_inaktivitaet_tage ?? 90));
      setDiveraAktiv(Boolean(w.divera_aktiv));
      setDiveraApiKey(String(w.divera_api_key ?? ""));
      setDiveraModus(String(w.divera_modus ?? "polling"));
      setDiveraLetzterSync(String(w.divera_letzter_sync ?? ""));
      setDiveraLetzterSyncAnzahl(Number(w.divera_letzter_sync_anzahl ?? 0));
      setFehlerberichteAktiv(Boolean(w.fehlerberichte_aktiv));
      setBenachrichtigungEinsatz(Boolean(w.benachrichtigung_neuer_einsatz));
      setBenachrichtigungDiveraAlarm(Boolean(w.benachrichtigung_divera_alarm ?? true));
      setBenachrichtigungDienstbuch(Boolean(w.benachrichtigung_neues_dienstbuch));
      setBenachrichtigungBuchung(Boolean(w.benachrichtigung_buchungsanfrage));
      setBenachrichtigungSchwellenwert(Boolean(w.benachrichtigung_schwellenwert_ueberschreitung));
      setBenachrichtigungPersonInaktiv(Boolean(w.benachrichtigung_person_inaktiv));
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
        modul_einsatztagebuch_aktiv: modulEinsatztagebuch,
        modul_dienstbuch_aktiv: modulDienstbuch,
        modul_dienststunden_aktiv: modulDienststunden,
        modul_fahrzeugbuchung_aktiv: modulFahrzeugbuchung,
        modul_einsatztagebuch_startseite: modulEinsatztagebuchStartseite,
        modul_dienstbuch_startseite: modulDienstbuchStartseite,
        modul_dienststunden_startseite: modulDienststundenStartseite,
        modul_fahrzeugbuchung_startseite: modulFahrzeugbuchungStartseite,
        modul_einsatztagebuch_aussenzugriff: modulEinsatztagebuchAussenzugriff,
        modul_dienstbuch_aussenzugriff: modulDienstbuchAussenzugriff,
        modul_dienststunden_aussenzugriff: modulDienststundenAussenzugriff,
        modul_fahrzeugbuchung_aussenzugriff: modulFahrzeugbuchungAussenzugriff,
        dienstbuch_zeitfenster_stunden: dienstbuchZeitfenster,
        dienstbuch_autoschluss_stunde: dienstbuchAutoschlussStunde,
        archivierungszeitraum_jahre: archivierungszeitraum,
        einsatz_countdown_minuten: einsatzCountdownMinuten,
        einsatz_alle_eingetragen_minuten: alleEingetragenMinuten,
        einsatz_autoabschluss_stunde: autoabschlussStunde,
        einsatz_autoabschluss_inaktivitaet_stunden: autoabschlussInaktivitaetStunden,
        personen_sortierung: personenSortierung,
        personen_inaktivitaet_tage: personenInaktivitaetTage,
        divera_aktiv: diveraAktiv,
        divera_api_key: diveraApiKey,
        divera_modus: diveraModus,
        fehlerberichte_aktiv: fehlerberichteAktiv,
        benachrichtigung_neuer_einsatz: benachrichtigungEinsatz,
        benachrichtigung_divera_alarm: benachrichtigungDiveraAlarm,
        benachrichtigung_neues_dienstbuch: benachrichtigungDienstbuch,
        benachrichtigung_buchungsanfrage: benachrichtigungBuchung,
        benachrichtigung_schwellenwert_ueberschreitung: benachrichtigungSchwellenwert,
        benachrichtigung_person_inaktiv: benachrichtigungPersonInaktiv,
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

  async function diveraEinsaetzeHolen() {
    setDiveraHolenLaeuft(true);
    setDiveraHolenErgebnis(null);
    try {
      const { anzahl_gefunden, anzahl_neu } = await diveraEinsaetzeNachholen();
      setDiveraHolenErgebnis(
        anzahl_gefunden === 0
          ? "Keine Alarme in den letzten 24 Stunden gefunden."
          : `${anzahl_gefunden} Alarm${anzahl_gefunden !== 1 ? "e" : ""} gefunden, ${anzahl_neu} neu importiert.`
      );
    } catch (err) {
      setDiveraHolenErgebnis(err instanceof ApiError ? String(err.detail) : "Abruf fehlgeschlagen.");
    } finally {
      setDiveraHolenLaeuft(false);
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
              <img src={logoUrl} alt="Logo" style={{ height: 50, marginBottom: 8 }} />
            )}
            <input
              id="e-logo"
              type="file"
              accept="image/png,image/svg+xml"
              onChange={(e) => e.target.files?.[0] && logoHochladen(e.target.files[0])}
            />
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
          <h2>Module</h2>
          <p style={{ fontSize: "0.85rem", color: "var(--farbe-text-mute)" }}>
            "Aktiv" steuert, ob das Modul überhaupt erreichbar ist. "Auf Startseite anzeigen" steuert,
            ob dafür eine Kachel im Gerätehaus-Kiosk erscheint. "Außenzugriff" steuert, ob Mitglieder das
            Modul auch über den öffentlichen Mitglieder-Login (außerhalb des Gerätehauses) nutzen dürfen.
          </p>
          <div className="tabelle-scroll">
          <table>
            <thead>
              <tr>
                <th>Modul</th>
                <th>Aktiv</th>
                <th>Auf Startseite anzeigen</th>
                <th>Außenzugriff</th>
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
                <td>
                  <input
                    type="checkbox"
                    checked={modulEinsatztagebuchAussenzugriff}
                    onChange={(e) => setModulEinsatztagebuchAussenzugriff(e.target.checked)}
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
                <td>
                  <input
                    type="checkbox"
                    checked={modulDienstbuchAussenzugriff}
                    onChange={(e) => setModulDienstbuchAussenzugriff(e.target.checked)}
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
                <td>
                  <input
                    type="checkbox"
                    checked={modulDienststundenAussenzugriff}
                    onChange={(e) => setModulDienststundenAussenzugriff(e.target.checked)}
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
                <td>
                  <input
                    type="checkbox"
                    checked={modulFahrzeugbuchungAussenzugriff}
                    onChange={(e) => setModulFahrzeugbuchungAussenzugriff(e.target.checked)}
                  />
                </td>
              </tr>
            </tbody>
          </table>
          </div>
        </div>

        <div className="karte">
          <h2>Zeitfenster &amp; Schwellenwerte</h2>
          <div className="formular-feld">
            <label htmlFor="e-zeitfenster">Dienstbuch-Zeitfenster (Stunden)</label>
            <input
              id="e-zeitfenster"
              type="number"
              min={1}
              value={dienstbuchZeitfenster}
              onChange={(e) => setDienstbuchZeitfenster(Number(e.target.value))}
            />
          </div>
          <div className="formular-feld">
            <label htmlFor="e-dienstbuch-autoschluss">
              Offene Dienstbücher automatisch schließen um (Uhrzeit, Stunde 0–23)
            </label>
            <input
              id="e-dienstbuch-autoschluss"
              type="number"
              min={0}
              max={23}
              value={dienstbuchAutoschlussStunde}
              onChange={(e) => setDienstbuchAutoschlussStunde(Number(e.target.value))}
            />
          </div>
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
          <div className="formular-feld">
            <label htmlFor="e-countdown">Einsatz-Countdown im Gerätehaus (Minuten)</label>
            <input
              id="e-countdown"
              type="number"
              min={1}
              value={einsatzCountdownMinuten}
              onChange={(e) => setEinsatzCountdownMinuten(Number(e.target.value))}
            />
          </div>
          <div className="formular-feld">
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
          </div>
          <div className="formular-feld">
            <label htmlFor="e-autoabschluss-stunde">Automatischer Einsatzabschluss um (Uhrzeit, Stunde 0–23)</label>
            <input
              id="e-autoabschluss-stunde"
              type="number"
              min={0}
              max={23}
              value={autoabschlussStunde}
              onChange={(e) => setAutoabschlussStunde(Number(e.target.value))}
            />
          </div>
          <div className="formular-feld">
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
            <p style={{ fontSize: "0.85rem", color: "var(--farbe-text-mute)" }}>
              Offene Einsätze werden täglich zur eingestellten Stunde automatisch abgeschlossen,
              wenn seit der letzten Bearbeitung mindestens so viele Stunden vergangen sind.
            </p>
          </div>
        </div>

        <div className="karte">
          <h2>Benachrichtigungen</h2>
          <div className="formular-feld">
            <label>
              <input
                type="checkbox"
                checked={benachrichtigungEinsatz}
                onChange={(e) => setBenachrichtigungEinsatz(e.target.checked)}
              />{" "}
              Einsatz abgeschlossen
            </label>
          </div>
          <div className="formular-feld">
            <label>
              <input
                type="checkbox"
                checked={benachrichtigungDiveraAlarm}
                onChange={(e) => setBenachrichtigungDiveraAlarm(e.target.checked)}
              />{" "}
              Neuer Einsatz via Divera angelegt
            </label>
          </div>
          <div className="formular-feld">
            <label>
              <input
                type="checkbox"
                checked={benachrichtigungDienstbuch}
                onChange={(e) => setBenachrichtigungDienstbuch(e.target.checked)}
              />{" "}
              Neues Dienstbuch
            </label>
          </div>
          <div className="formular-feld">
            <label>
              <input
                type="checkbox"
                checked={benachrichtigungBuchung}
                onChange={(e) => setBenachrichtigungBuchung(e.target.checked)}
              />{" "}
              Neue Buchungsanfrage
            </label>
          </div>
          <div className="formular-feld">
            <label>
              <input
                type="checkbox"
                checked={benachrichtigungSchwellenwert}
                onChange={(e) => setBenachrichtigungSchwellenwert(e.target.checked)}
              />{" "}
              Schwellenwert-Überschreitung
            </label>
          </div>
          <div className="formular-feld">
            <label>
              <input
                type="checkbox"
                checked={benachrichtigungPersonInaktiv}
                onChange={(e) => setBenachrichtigungPersonInaktiv(e.target.checked)}
              />{" "}
              Person inaktiv (wird bald gelöscht)
            </label>
          </div>
        </div>

        <div className="karte">
          <h2>Personen</h2>
          <div className="formular-feld">
            <label htmlFor="e-personen-sortierung">Sortierung der Personenliste</label>
            <select
              id="e-personen-sortierung"
              value={personenSortierung}
              onChange={(e) => setPersonenSortierung(e.target.value)}
            >
              <option value="nachname">Nach Nachname</option>
              <option value="gruppe_nachname">Nach Gruppe, dann Nachname</option>
            </select>
          </div>
          <div className="formular-feld">
            <label htmlFor="e-personen-inaktivitaet">
              Person löschen nach Inaktivität (Tage ohne neuen Timeline-Eintrag)
            </label>
            <input
              id="e-personen-inaktivitaet"
              type="number"
              min={0}
              value={personenInaktivitaetTage}
              onChange={(e) => setPersonenInaktivitaetTage(Number(e.target.value))}
            />
            <p style={{ fontSize: "0.85rem", color: "var(--farbe-text-mute)" }}>
              7 Tage vor der automatischen Löschung wird einmalig eine Benachrichtigung verschickt.
              Erfolgt in dieser Zeit keine neue Aktivität, wird die Person inkl. aller zugehörigen Daten
              (Dienststunden, Einsätze, Dienstbücher, Barcodes, Buchungen) endgültig gelöscht. 0 = deaktiviert.
            </p>
          </div>
        </div>

        <div className="karte">
          <h2>Divera 24/7</h2>
          <p style={{ fontSize: "0.85rem", color: "var(--farbe-text-mute)" }}>
            Ersetzt die frühere .env-Konfiguration – Änderungen wirken ohne Neustart.
          </p>
          <div className="formular-feld">
            <label>
              <input type="checkbox" checked={diveraAktiv} onChange={(e) => setDiveraAktiv(e.target.checked)} />{" "}
              Divera-Anbindung aktiv
            </label>
          </div>
          <div className="formular-feld">
            <label htmlFor="e-divera-modus">Modus</label>
            <select id="e-divera-modus" value={diveraModus} onChange={(e) => setDiveraModus(e.target.value)}>
              <option value="polling">Polling (alle 5 Minuten abfragen)</option>
              <option value="webhook">Webhook (Divera sendet aktiv)</option>
            </select>
          </div>
          <div className="formular-feld">
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
          {diveraLetzterSync ? (
            <p style={{ fontSize: "0.85rem", color: "var(--farbe-text-mute)" }}>
              Letzter Polling-Abruf:{" "}
              {new Date(diveraLetzterSync).toLocaleString("de-DE")} &middot;{" "}
              {diveraLetzterSyncAnzahl} Alarm{diveraLetzterSyncAnzahl !== 1 ? "e" : ""} abgerufen
            </p>
          ) : (
            diveraAktiv && diveraModus === "polling" && (
              <p style={{ fontSize: "0.85rem", color: "var(--farbe-text-mute)" }}>
                Noch kein Polling-Abruf seit dem letzten Start.
              </p>
            )
          )}
          {diveraAktiv && (
            <div style={{ marginTop: "1rem" }}>
              <button
                type="button"
                onClick={diveraEinsaetzeHolen}
                disabled={diveraHolenLaeuft}
              >
                {diveraHolenLaeuft ? "Wird abgerufen…" : "Einsätze letzte 24 Stunden holen"}
              </button>
              {diveraHolenErgebnis && (
                <p style={{ marginTop: "0.5rem", fontSize: "0.85rem", color: "var(--farbe-text-mute)" }}>
                  {diveraHolenErgebnis}
                </p>
              )}
            </div>
          )}
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
