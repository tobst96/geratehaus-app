import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  holeMinioEinstellungen,
  setzeMinioEinstellungen,
  testeMinioVerbindung,
  type MinioEinstellungen,
} from "../../../api/minio";
import { ApiError } from "../../../api/client";
import { Ladeanzeige } from "../../../components/Ladeanzeige";

export function MinioModul() {
  const [einst, setEinst] = useState<MinioEinstellungen | null>(null);
  const [secret, setSecret] = useState("");
  const [meldung, setMeldung] = useState<string | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [testMeldung, setTestMeldung] = useState<string | null>(null);
  const [testOk, setTestOk] = useState(false);
  const [laeuft, setLaeuft] = useState(false);

  useEffect(() => {
    holeMinioEinstellungen()
      .then(setEinst)
      .catch((err) => setFehler(err instanceof ApiError ? String(err.detail) : "Laden fehlgeschlagen."));
  }, []);

  function feld<K extends keyof MinioEinstellungen>(key: K, wert: MinioEinstellungen[K]) {
    setEinst((e) => (e ? { ...e, [key]: wert } : e));
  }

  async function speichern() {
    if (!einst) return;
    setLaeuft(true);
    setFehler(null);
    setMeldung(null);
    try {
      await setzeMinioEinstellungen({
        endpoint: einst.endpoint,
        console_url: einst.console_url,
        region: einst.region,
        access_key: einst.access_key,
        bucket_backups: einst.bucket_backups,
        bucket_einsaetze: einst.bucket_einsaetze,
        bucket_dienstbuecher: einst.bucket_dienstbuecher,
        ...(secret ? { secret_key: secret } : {}),
      });
      setSecret("");
      setMeldung("Gespeichert.");
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Speichern fehlgeschlagen.");
    } finally {
      setLaeuft(false);
    }
  }

  async function testen() {
    setLaeuft(true);
    setTestMeldung("Teste Verbindung …");
    setTestOk(false);
    try {
      const r = await testeMinioVerbindung();
      setTestOk(r.ok);
      setTestMeldung((r.ok ? "✓ " : "✗ ") + r.meldung);
    } catch (err) {
      setTestOk(false);
      setTestMeldung("✗ " + (err instanceof ApiError ? String(err.detail) : "Test fehlgeschlagen."));
    } finally {
      setLaeuft(false);
    }
  }

  if (!einst) return fehler ? <p className="fehlertext">{fehler}</p> : <Ladeanzeige />;

  return (
    <div>
      <p>
        <Link to="/moderator/module">← Zurück zu den Modulen</Link>
      </p>
      <h1>MinIO</h1>
      <p style={{ color: "var(--farbe-text-mute)" }}>
        Objektspeicher (MinIO oder S3-kompatibel). Ist dieses Modul aktiv, werden erzeugte Dokumente
        automatisch abgelegt (Einsätze als Ordner je Einsatz, Dienstbücher flach) und das Backup-Modul
        kann „MinIO Backup" nutzen. Das Modul lässt sich unter „Module" an-/abschalten.
      </p>
      {fehler && <p className="fehlertext">{fehler}</p>}
      {meldung && <p style={{ color: "var(--farbe-text-mute)" }}>{meldung}</p>}

      <div className="karte">
        <h2>Verbindung</h2>
        <div className="formular-feld">
          <label htmlFor="ep">Endpoint (S3-API – mitgeliefertes MinIO: http://minio:9000)</label>
          <input id="ep" value={einst.endpoint} onChange={(e) => feld("endpoint", e.target.value)} />
        </div>
        <div className="formular-feld">
          <label htmlFor="cu">Konsolen-URL (Weboberfläche, im Browser erreichbar – z. B. http://192.168.2.8:9001)</label>
          <input
            id="cu"
            value={einst.console_url}
            onChange={(e) => feld("console_url", e.target.value)}
            placeholder="http://<server>:9001"
          />
        </div>
        <div className="formular-feld">
          <label htmlFor="rg">Region</label>
          <input id="rg" value={einst.region} onChange={(e) => feld("region", e.target.value)} />
        </div>
        <div className="formular-feld">
          <label htmlFor="ak">Access Key</label>
          <input id="ak" value={einst.access_key} onChange={(e) => feld("access_key", e.target.value)} />
        </div>
        <div className="formular-feld">
          <label htmlFor="sk">Secret Key</label>
          <input
            id="sk"
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder={einst.secret_gesetzt ? "•••••• (gesetzt)" : ""}
            autoComplete="new-password"
          />
        </div>
      </div>

      <div className="karte">
        <h2>Buckets</h2>
        <div className="formular-feld">
          <label htmlFor="bb">Backups</label>
          <input id="bb" value={einst.bucket_backups} onChange={(e) => feld("bucket_backups", e.target.value)} />
        </div>
        <div className="formular-feld">
          <label htmlFor="be">Einsätze (Ordner je Einsatz)</label>
          <input id="be" value={einst.bucket_einsaetze} onChange={(e) => feld("bucket_einsaetze", e.target.value)} />
        </div>
        <div className="formular-feld">
          <label htmlFor="bd">Dienstbücher (flach)</label>
          <input id="bd" value={einst.bucket_dienstbuecher} onChange={(e) => feld("bucket_dienstbuecher", e.target.value)} />
        </div>
        <p style={{ color: "var(--farbe-text-mute)", fontSize: "0.85rem" }}>
          Buckets werden bei Bedarf automatisch angelegt.
        </p>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button onClick={speichern} disabled={laeuft}>
          {laeuft ? "…" : "Speichern"}
        </button>
        <button className="sekundaer" onClick={testen} disabled={laeuft}>
          Verbindung testen
        </button>
        {einst.console_url ? (
          <button
            type="button"
            className="sekundaer"
            onClick={() => window.open(einst.console_url, "_blank", "noopener")}
          >
            MinIO-Konsole öffnen ↗
          </button>
        ) : (
          <span style={{ color: "var(--farbe-text-mute)", fontSize: "0.85rem" }}>
            Konsolen-URL eintragen &amp; speichern, um die MinIO-Oberfläche zu öffnen.
          </span>
        )}
        {testMeldung && (
          <span style={{ color: testOk ? "var(--farbe-text-mute)" : "#c62828", fontWeight: 600 }}>
            {testMeldung}
          </span>
        )}
      </div>
      <p style={{ color: "var(--farbe-text-mute)", fontSize: "0.85rem", marginTop: 8 }}>
        Hinweis: Die MinIO-Konsole öffnet sich in einem neuen Tab; dort mit den MinIO-Zugangsdaten
        (Access/Secret bzw. Root-User) anmelden. Ein automatischer Login ist aus Sicherheitsgründen
        nicht möglich.
      </p>
    </div>
  );
}
