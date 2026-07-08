import { Fehlertext } from "../../../components/Fehlertext";
import { useEffect, useRef, useState } from "react";
import { formatiereDatumZeit } from "../../../utils/datum";
import { Link } from "react-router-dom";
import {
  analysiereBackup,
  holeBackupEinstellungen,
  holeBackups,
  holeBackupIntegritaet,
  importiereBackup,
  jetztSichern,
  ladeBackupHerunter,
  loescheBackup,
  pruefeBackupIntegritaet,
  setzeBackupEinstellungen,
  type BackupAnalyse,
  type BackupEinstellungen,
  type BackupIntegritaet,
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
  const [s3Secret, setS3Secret] = useState("");
  const [sftpPw, setSftpPw] = useState("");
  const [backups, setBackups] = useState<BackupOut[]>([]);
  const [meldung, setMeldung] = useState<string | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);
  const [integritaet, setIntegritaet] = useState<BackupIntegritaet | null>(null);
  const [pruefeLaeuft, setPruefeLaeuft] = useState(false);

  // Import-Ablauf
  const [analyse, setAnalyse] = useState<BackupAnalyse | null>(null);
  const [importPw, setImportPw] = useState("");
  const [gewaehlt, setGewaehlt] = useState<Set<string>>(new Set());
  const [modus, setModus] = useState<"ersetzen" | "zusammenfuehren">("ersetzen");
  const dateiInput = useRef<HTMLInputElement>(null);

  async function laden() {
    try {
      const [e, b, i] = await Promise.all([
        holeBackupEinstellungen(),
        holeBackups(),
        holeBackupIntegritaet().catch(() => null),
      ]);
      setEinst(e);
      setBackups(b);
      setIntegritaet(i);
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Laden fehlgeschlagen.");
    }
  }

  async function integritaetPruefen() {
    setPruefeLaeuft(true);
    setFehler(null);
    try {
      setIntegritaet(await pruefeBackupIntegritaet());
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Prüfung fehlgeschlagen.");
    } finally {
      setPruefeLaeuft(false);
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
        s3_aktiv: einst.s3_aktiv,
        s3_endpoint: einst.s3_endpoint,
        s3_region: einst.s3_region,
        s3_bucket: einst.s3_bucket,
        s3_access_key: einst.s3_access_key,
        s3_pfad: einst.s3_pfad,
        sftp_aktiv: einst.sftp_aktiv,
        sftp_host: einst.sftp_host,
        sftp_port: einst.sftp_port,
        sftp_user: einst.sftp_user,
        sftp_pfad: einst.sftp_pfad,
        email_aktiv: einst.email_aktiv,
        pdf_archiv_aktiv: einst.pdf_archiv_aktiv,
        pdf_archiv_pfad: einst.pdf_archiv_pfad,
        minio_aktiv: einst.minio_aktiv,
        ...(passphrase ? { passphrase } : {}),
        ...(webdavPw ? { webdav_passwort: webdavPw } : {}),
        ...(s3Secret ? { s3_secret_key: s3Secret } : {}),
        ...(sftpPw ? { sftp_passwort: sftpPw } : {}),
      });
      setPassphrase("");
      setWebdavPw("");
      setS3Secret("");
      setSftpPw("");
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ margin: 0 }}>Backup</h1>
        <button onClick={sichern} disabled={laeuft}>
          {laeuft ? "Sichert …" : "Jetzt Backup erstellen"}
        </button>
      </div>
      {fehler && <Fehlertext>{fehler}</Fehlertext>}
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
          <p className="hinweistext">
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

        <label style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12 }}>
          <input type="checkbox" checked={einst.s3_aktiv} onChange={(e) => feld("s3_aktiv", e.target.checked)} />
          S3-kompatibel (AWS S3, externes MinIO, Backblaze B2 …)
        </label>
        <div className="formular-feld">
          <label htmlFor="s3e">Endpoint (leer = AWS; MinIO z. B. http://minio:9000)</label>
          <input id="s3e" value={einst.s3_endpoint} onChange={(e) => feld("s3_endpoint", e.target.value)} />
        </div>
        <div className="formular-feld">
          <label htmlFor="s3b">Bucket</label>
          <input id="s3b" value={einst.s3_bucket} onChange={(e) => feld("s3_bucket", e.target.value)} />
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <div className="formular-feld" style={{ flex: 1, minWidth: 160 }}>
            <label htmlFor="s3r">Region</label>
            <input id="s3r" value={einst.s3_region} onChange={(e) => feld("s3_region", e.target.value)} />
          </div>
          <div className="formular-feld" style={{ flex: 1, minWidth: 160 }}>
            <label htmlFor="s3p">Präfix/Ordner</label>
            <input id="s3p" value={einst.s3_pfad} onChange={(e) => feld("s3_pfad", e.target.value)} />
          </div>
        </div>
        <div className="formular-feld">
          <label htmlFor="s3a">Access Key</label>
          <input id="s3a" value={einst.s3_access_key} onChange={(e) => feld("s3_access_key", e.target.value)} />
        </div>
        <div className="formular-feld">
          <label htmlFor="s3s">Secret Key</label>
          <input
            id="s3s"
            type="password"
            value={s3Secret}
            onChange={(e) => setS3Secret(e.target.value)}
            placeholder={einst.s3_secret_gesetzt ? "•••••• (gesetzt)" : ""}
            autoComplete="new-password"
          />
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12 }}>
          <input type="checkbox" checked={einst.sftp_aktiv} onChange={(e) => feld("sftp_aktiv", e.target.checked)} />
          SFTP / SSH
        </label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <div className="formular-feld" style={{ flex: 2, minWidth: 200 }}>
            <label htmlFor="sfh">Host</label>
            <input id="sfh" value={einst.sftp_host} onChange={(e) => feld("sftp_host", e.target.value)} />
          </div>
          <div className="formular-feld" style={{ flex: 1, minWidth: 100 }}>
            <label htmlFor="sfpo">Port</label>
            <input id="sfpo" type="number" value={einst.sftp_port} onChange={(e) => feld("sftp_port", Number(e.target.value))} />
          </div>
        </div>
        <div className="formular-feld">
          <label htmlFor="sfu">Benutzer</label>
          <input id="sfu" value={einst.sftp_user} onChange={(e) => feld("sftp_user", e.target.value)} />
        </div>
        <div className="formular-feld">
          <label htmlFor="sfpw">Passwort</label>
          <input
            id="sfpw"
            type="password"
            value={sftpPw}
            onChange={(e) => setSftpPw(e.target.value)}
            placeholder={einst.sftp_passwort_gesetzt ? "•••••• (gesetzt)" : ""}
            autoComplete="new-password"
          />
        </div>
        <div className="formular-feld">
          <label htmlFor="sfp">Zielverzeichnis</label>
          <input id="sfp" value={einst.sftp_pfad} onChange={(e) => feld("sftp_pfad", e.target.value)} />
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12 }}>
          <input type="checkbox" checked={einst.email_aktiv} onChange={(e) => feld("email_aktiv", e.target.checked)} />
          Als E-Mail-Anhang an die Benachrichtigungs-Empfänger (nur für kleine Instanzen)
        </label>

        {einst.minio_modul_aktiv ? (
          <label style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12 }}>
            <input type="checkbox" checked={einst.minio_aktiv} onChange={(e) => feld("minio_aktiv", e.target.checked)} />
            MinIO Backup (nutzt die Verbindung aus dem Modul „MinIO")
          </label>
        ) : (
          <p style={{ color: "var(--farbe-text-mute)", fontSize: "0.85rem", marginTop: 12 }}>
            Für „MinIO Backup" zuerst das Modul „MinIO" unter Module aktivieren und konfigurieren.
          </p>
        )}
      </div>

      {/* --- PDF-Archiv --- */}
      <div className="karte">
        <h2>PDF-Archiv (Objektspeicher)</h2>
        <p style={{ color: "var(--farbe-text-mute)" }}>
          Legt jede erzeugte PDF (Einsatz-/Dienstbuch-Abschluss, Listen-Exporte) zusätzlich im
          S3-Objektspeicher ab. Benötigt ein aktives S3-Ziel (siehe oben).
        </p>
        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input
            type="checkbox"
            checked={einst.pdf_archiv_aktiv}
            onChange={(e) => feld("pdf_archiv_aktiv", e.target.checked)}
          />
          Erzeugte PDFs im S3-Objektspeicher archivieren
        </label>
        <div className="formular-feld">
          <label htmlFor="pdfp">Präfix/Ordner</label>
          <input id="pdfp" value={einst.pdf_archiv_pfad} onChange={(e) => feld("pdf_archiv_pfad", e.target.value)} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        <button onClick={speichern} disabled={laeuft}>
          {laeuft ? "Speichert …" : "Einstellungen speichern"}
        </button>
        <button className="sekundaer" onClick={sichern} disabled={laeuft}>
          Jetzt Backup erstellen
        </button>
      </div>

      {/* --- Integritätsprüfung --- */}
      <div className="karte">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <h2 style={{ margin: 0 }}>Integritätsprüfung</h2>
          <button type="button" className="sekundaer" onClick={integritaetPruefen} disabled={pruefeLaeuft}>
            {pruefeLaeuft ? "Prüfe …" : "Jetzt prüfen"}
          </button>
        </div>
        <p className="hinweistext">
          Das neueste Backup wird täglich automatisch <strong>rein lesend</strong> geprüft
          (Entschlüsselung, Archiv- und Datenintegrität) – ohne Rückspielen in die Datenbank.
          So fällt ein beschädigtes Backup oder eine geänderte Passphrase auf.
        </p>
        {integritaet && (integritaet.ok !== null || integritaet.geprueft_am) ? (
          <p style={{ margin: 0 }}>
            <strong
              style={{ color: integritaet.ok === false ? "#b00020" : integritaet.ok ? "#2e9e4f" : "var(--farbe-text-mute)" }}
            >
              {integritaet.ok === true ? "● OK" : integritaet.ok === false ? "● Fehler" : "● unbekannt"}
            </strong>{" "}
            {integritaet.detail}
            {integritaet.geprueft_am && (
              <span style={{ color: "var(--farbe-text-mute)" }}>
                {" "}· geprüft {formatiereDatumZeit(integritaet.geprueft_am)}
              </span>
            )}
          </p>
        ) : (
          <p style={{ color: "var(--farbe-text-mute)", margin: 0 }}>Noch keine Prüfung durchgeführt.</p>
        )}
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
                    <td>{formatiereDatumZeit(b.erstellt_am)}</td>
                    <td>{groesse(b.groesse_bytes)}</td>
                    <td>{b.ziele || "–"}</td>
                    <td className="hinweistext">
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
              <strong>{analyse.erstellt_am ? formatiereDatumZeit(analyse.erstellt_am) : "?"}</strong>
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
            <Fehlertext style={{ fontSize: "0.85rem" }}>
              ⚠️ „Ersetzen" löscht die vorhandenen Daten der gewählten Bereiche. Enthält der Import
              Zugänge/Branding, kann sich Login und Erscheinungsbild ändern.
            </Fehlertext>
            <button onClick={importieren} disabled={laeuft || gewaehlt.size === 0}>
              {laeuft ? "Importiert …" : "Import starten"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
