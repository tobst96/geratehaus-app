import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  analysiereBackup,
  holeBackupEinstellungen,
  holeBackups,
  importiereBackup,
  jetztSichern,
  ladeBackupHerunter,
  loescheBackup,
  setzeBackupEinstellungen,
  type BackupAnalyse,
  type BackupEinstellungen,
  type BackupOut,
} from "../../../api/backup";
import { ApiError } from "../../../api/client";
import { Ladeanzeige } from "../../../components/Ladeanzeige";

const WOCHENTAGE = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

function groesse(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function BackupModul() {
  const [einst, setEinst] = useState<BackupEinstellungen | null>(null);
  const [passphrase, setPassphrase] = useState("");
  const [webdavPw, setWebdavPw] = useState("");
  const [backups, setBackups] = useState<BackupOut[]>([]);
  const [meldung, setMeldung] = useState<string | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);

  // Import-Ablauf
  const [analyse, setAnalyse] = useState<BackupAnalyse | null>(null);
  const [importPw, setImportPw] = useState("");
  const [gewaehlt, setGewaehlt] = useState<Set<string>>(new Set());
  const [modus, setModus] = useState<"ersetzen" | "zusammenfuehren">("ersetzen");
  const dateiInput = useRef<HTMLInputElement>(null);

  async function laden() {
    try {
      const [e, b] = await Promise.all([holeBackupEinstellungen(), holeBackups()]);
      setEinst(e);
      setBackups(b);
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Laden fehlgeschlagen.");
    }
  }

  useEffect(() => {
    laden();
  }, []);

  function feld<K extends keyof BackupEinstellungen>(key: K, wert: BackupEinstellungen[K]) {
    setEinst((e) => (e ? { ...e, [key]: wert } : e));
  }

  function wochentagUmschalten(tag: number) {
    setEinst((e) => {
      if (!e) return e;
      const set = new Set(e.wochentage);
      set.has(tag) ? set.delete(tag) : set.add(tag);
      return { ...e, wochentage: [...set].sort() };
    });
  }

  async function speichern() {
    if (!einst) return;
    setLaeuft(true);
    setFehler(null);
    setMeldung(null);
    try {
      await setzeBackupEinstellungen({
        zeit_stunde: einst.zeit_stunde,
        zeit_minute: einst.zeit_minute,
        wochentage: einst.wochentage,
        max_anzahl: einst.max_anzahl,
        lokal_aktiv: einst.lokal_aktiv,
        lokal_pfad: einst.lokal_pfad,
        webdav_aktiv: einst.webdav_aktiv,
        webdav_url: einst.webdav_url,
        webdav_user: einst.webdav_user,
        webdav_pfad: einst.webdav_pfad,
        fehler_mail_aktiv: einst.fehler_mail_aktiv,
        ...(passphrase ? { passphrase } : {}),
        ...(webdavPw ? { webdav_passwort: webdavPw } : {}),
      });
      setPassphrase("");
      setWebdavPw("");
      setMeldung("Einstellungen gespeichert.");
      await laden();
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Speichern fehlgeschlagen.");
    } finally {
      setLaeuft(false);
    }
  }

  async function sichern() {
    setLaeuft(true);
    setFehler(null);
    setMeldung(null);
    try {
      await jetztSichern();
      setMeldung("Backup erstellt.");
      await laden();
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Backup fehlgeschlagen.");
    } finally {
      setLaeuft(false);
    }
  }

  async function loeschen(id: number) {
    if (!confirm("Dieses Backup wirklich löschen?")) return;
    try {
      await loescheBackup(id);
      await laden();
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Löschen fehlgeschlagen.");
    }
  }

  async function analysieren() {
    const datei = dateiInput.current?.files?.[0];
    if (!datei) return;
    setLaeuft(true);
    setFehler(null);
    setMeldung(null);
    try {
      const a = await analysiereBackup(datei, importPw || undefined);
      setAnalyse(a);
      setGewaehlt(new Set(a.kategorien.filter((k) => k.anzahl > 0).map((k) => k.key)));
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Datei konnte nicht gelesen werden.");
    } finally {
      setLaeuft(false);
    }
  }

  async function importieren() {
    if (!analyse) return;
    if (!confirm("Import startet jetzt und verändert bestehende Daten. Fortfahren?")) return;
    setLaeuft(true);
    setFehler(null);
    try {
      const r = await importiereBackup(analyse.token, [...gewaehlt], modus);
      setMeldung(
        `Import fertig: ${r.importierte_datensaetze} Datensätze, ${r.importierte_dateien} Dateien.`,
      );
      setAnalyse(null);
      if (dateiInput.current) dateiInput.current.value = "";
      await laden();
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Import fehlgeschlagen.");
    } finally {
      setLaeuft(false);
    }
  }

  if (!einst) return <Ladeanzeige />;

  return (
    <div>
      <p>
        <Link to="/moderator/module">← Zurück zu den Modulen</Link>
      </p>
      <h1>Backup</h1>
      {fehler && <p className="fehlertext">{fehler}</p>}
      {meldung && <p style={{ color: "var(--farbe-text-mute)" }}>{meldung}</p>}

      {/* --- Zeitplan & Aufbewahrung --- */}
      <div className="karte">
        <h2>Zeitplan &amp; Aufbewahrung</h2>
        <div className="formular-feld">
          <label>Uhrzeit (automatisches Backup)</label>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="number"
              min={0}
              max={23}
              value={einst.zeit_stunde}
              onChange={(e) => feld("zeit_stunde", Number(e.target.value))}
              style={{ width: 80 }}
            />
            :
            <input
              type="number"
              min={0}
              max={59}
              value={einst.zeit_minute}
              onChange={(e) => feld("zeit_minute", Number(e.target.value))}
              style={{ width: 80 }}
            />
          </div>
        </div>
        <div className="formular-feld">
          <label>Wochentage</label>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {WOCHENTAGE.map((label, i) => (
              <label key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <input
                  type="checkbox"
                  checked={einst.wochentage.includes(i)}
                  onChange={() => wochentagUmschalten(i)}
                />
                {label}
              </label>
            ))}
          </div>
        </div>
        <div className="formular-feld">
          <label htmlFor="max">Maximale Anzahl aufbewahrter Backups (älteste wird gelöscht)</label>
          <input
            id="max"
            type="number"
            min={1}
            value={einst.max_anzahl}
            onChange={(e) => feld("max_anzahl", Number(e.target.value))}
          />
        </div>
        <div className="formular-feld">
          <label htmlFor="pw">Verschlüsselungs-Passphrase</label>
          <input
            id="pw"
            type="password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            placeholder={einst.passphrase_gesetzt ? "•••••• (gesetzt – leer lassen = unverändert)" : "Passphrase setzen"}
            autoComplete="new-password"
          />
          <p style={{ fontSize: "0.85rem", color: "var(--farbe-text-mute)" }}>
            Ohne Passphrase werden Backups unverschlüsselt abgelegt. Backups enthalten sensible Daten
            (PIN-/Passwort-Hashes) – eine Passphrase wird dringend empfohlen. Ohne sie ist kein Import
            eines verschlüsselten Backups möglich.
          </p>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input
            type="checkbox"
            checked={einst.fehler_mail_aktiv}
            onChange={(e) => feld("fehler_mail_aktiv", e.target.checked)}
          />
          Bei fehlgeschlagenem Backup Admins per E-Mail benachrichtigen
        </label>
      </div>

      {/* --- Ziele --- */}
      <div className="karte">
        <h2>Ablageziele</h2>
        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input type="checkbox" checked={einst.lokal_aktiv} onChange={(e) => feld("lokal_aktiv", e.target.checked)} />
          Lokaler Ordner / Mount
        </label>
        <div className="formular-feld">
          <label htmlFor="lp">Pfad im Container (per Docker-Bind-Mount außerhalb sicherbar)</label>
          <input id="lp" value={einst.lokal_pfad} onChange={(e) => feld("lokal_pfad", e.target.value)} />
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12 }}>
          <input type="checkbox" checked={einst.webdav_aktiv} onChange={(e) => feld("webdav_aktiv", e.target.checked)} />
          WebDAV (z. B. Nextcloud / ownCloud)
        </label>
        <div className="formular-feld">
          <label htmlFor="wu">WebDAV-URL</label>
          <input id="wu" value={einst.webdav_url} onChange={(e) => feld("webdav_url", e.target.value)} placeholder="https://cloud/remote.php/dav/files/user" />
        </div>
        <div className="formular-feld">
          <label htmlFor="wus">Benutzer</label>
          <input id="wus" value={einst.webdav_user} onChange={(e) => feld("webdav_user", e.target.value)} />
        </div>
        <div className="formular-feld">
          <label htmlFor="wpw">Passwort / App-Token</label>
          <input
            id="wpw"
            type="password"
            value={webdavPw}
            onChange={(e) => setWebdavPw(e.target.value)}
            placeholder={einst.webdav_passwort_gesetzt ? "•••••• (gesetzt)" : ""}
            autoComplete="new-password"
          />
        </div>
        <div className="formular-feld">
          <label htmlFor="wp">Unterordner</label>
          <input id="wp" value={einst.webdav_pfad} onChange={(e) => feld("webdav_pfad", e.target.value)} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        <button onClick={speichern} disabled={laeuft}>
          {laeuft ? "Speichert …" : "Einstellungen speichern"}
        </button>
        <button className="sekundaer" onClick={sichern} disabled={laeuft}>
          Jetzt sichern
        </button>
      </div>

      {/* --- Backup-Browser --- */}
      <div className="karte">
        <h2>Gespeicherte Backups</h2>
        {backups.length === 0 && <p style={{ color: "var(--farbe-text-mute)" }}>Noch keine Backups vorhanden.</p>}
        {backups.length > 0 && (
          <div className="tabelle-scroll">
            <table>
              <thead>
                <tr>
                  <th>Datum</th>
                  <th>Größe</th>
                  <th>Ziele</th>
                  <th>Inhalt</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {backups.map((b) => (
                  <tr key={b.id}>
                    <td>{new Date(b.erstellt_am).toLocaleString("de-DE")}</td>
                    <td>{groesse(b.groesse_bytes)}</td>
                    <td>{b.ziele || "–"}</td>
                    <td style={{ fontSize: "0.85rem", color: "var(--farbe-text-mute)" }}>
                      {b.status === "ok"
                        ? `${b.zusammenfassung?.datensaetze_gesamt ?? "?"} Datensätze, ${b.zusammenfassung?.datei_anzahl ?? "?"} Dateien${b.verschluesselt ? " · 🔒" : ""}`
                        : b.fehlermeldung}
                    </td>
                    <td>{b.status === "ok" ? (b.datei_vorhanden ? "✓" : "Datei fehlt") : "Fehler"}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {b.status === "ok" && b.datei_vorhanden && (
                        <button className="sekundaer" onClick={() => ladeBackupHerunter(b.id, b.dateiname)}>
                          Download
                        </button>
                      )}{" "}
                      <button className="sekundaer" onClick={() => loeschen(b.id)}>
                        Löschen
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- Import --- */}
      <div className="karte">
        <h2>Backup importieren</h2>
        <p style={{ color: "var(--farbe-text-mute)" }}>
          Backup-Datei (.ghb) hochladen, dann auswählen, welche Bereiche eingespielt werden.
        </p>
        <div className="formular-feld">
          <input ref={dateiInput} type="file" accept=".ghb,application/octet-stream" />
        </div>
        <div className="formular-feld">
          <label htmlFor="ipw">Passphrase (falls anders als gespeichert)</label>
          <input id="ipw" type="password" value={importPw} onChange={(e) => setImportPw(e.target.value)} autoComplete="new-password" />
        </div>
        <button className="sekundaer" onClick={analysieren} disabled={laeuft}>
          Datei analysieren
        </button>

        {analyse && (
          <div style={{ marginTop: 16 }}>
            <p>
              Backup vom{" "}
              <strong>{analyse.erstellt_am ? new Date(analyse.erstellt_am).toLocaleString("de-DE") : "?"}</strong>
              {analyse.app_version ? ` · Version ${analyse.app_version}` : ""}
            </p>
            <p style={{ fontWeight: 600, margin: "8px 0 4px" }}>Was importieren?</p>
            {analyse.kategorien.map((k) => (
              <label key={k.key} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                <input
                  type="checkbox"
                  checked={gewaehlt.has(k.key)}
                  onChange={(e) =>
                    setGewaehlt((s) => {
                      const neu = new Set(s);
                      e.target.checked ? neu.add(k.key) : neu.delete(k.key);
                      return neu;
                    })
                  }
                />
                {k.label} <span style={{ color: "var(--farbe-text-mute)" }}>({k.anzahl})</span>
              </label>
            ))}

            <div className="formular-feld" style={{ marginTop: 12 }}>
              <label>Modus</label>
              <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input type="radio" checked={modus === "ersetzen"} onChange={() => setModus("ersetzen")} />
                Ersetzen (gewählte Bereiche komplett überschreiben)
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input type="radio" checked={modus === "zusammenfuehren"} onChange={() => setModus("zusammenfuehren")} />
                Zusammenführen (nur fehlende Datensätze ergänzen)
              </label>
            </div>
            <p className="fehlertext" style={{ fontSize: "0.85rem" }}>
              ⚠️ „Ersetzen" löscht die vorhandenen Daten der gewählten Bereiche. Enthält der Import
              Zugänge/Branding, kann sich Login und Erscheinungsbild ändern.
            </p>
            <button onClick={importieren} disabled={laeuft || gewaehlt.size === 0}>
              {laeuft ? "Importiert …" : "Import starten"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
