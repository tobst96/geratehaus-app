import { useEffect, useState } from "react";
import { holeUpdateStatus, updateAusloesen, updateKanalSetzen, type UpdateStatus } from "../../api/moderator";
import { ApiError } from "../../api/client";
import { Ladeanzeige } from "../../components/Ladeanzeige";

export function Update() {
  const [status, setStatus] = useState<UpdateStatus | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [speichert, setSpeichert] = useState(false);
  const [installiert, setInstalliert] = useState(false);
  const [installMeldung, setInstallMeldung] = useState<string | null>(null);

  async function laden() {
    try {
      setStatus(await holeUpdateStatus());
      setFehler(null);
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Status konnte nicht geladen werden.");
    }
  }

  useEffect(() => {
    laden();
  }, []);

  async function updateInstallieren() {
    if (!confirm("Update jetzt installieren? Der Server aktualisiert sich und startet dabei kurz neu.")) return;
    setInstalliert(true);
    setInstallMeldung(null);
    try {
      const ergebnis = await updateAusloesen();
      setInstallMeldung(ergebnis.meldung);
      setFehler(null);
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Update konnte nicht angestoßen werden.");
    } finally {
      setInstalliert(false);
    }
  }

  async function kanalAendern(kanal: "stable" | "beta") {
    setSpeichert(true);
    try {
      setStatus(await updateKanalSetzen(kanal));
      setFehler(null);
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Kanal konnte nicht geändert werden.");
    } finally {
      setSpeichert(false);
    }
  }

  if (fehler && !status) return <p className="fehlertext">{fehler}</p>;
  if (!status) return <Ladeanzeige />;

  return (
    <div>
      <h1>Update</h1>

      <div className="karte">
        <h2>Update-Kanal</h2>
        <p style={{ color: "var(--farbe-text-mute)" }}>
          "Stable" zeigt nur fertige Veröffentlichungen an, "Beta" auch Vorabversionen. Ist eine
          neue Version verfügbar, kann sie unten per Klick installiert werden. Das Update wird von
          einem Skript auf dem Server ausgeführt (<code>git pull</code> +
          <code>docker compose up -d --build</code>); dazu muss <code>scripts/updater.sh</code>
          einmalig als Cronjob/systemd-Dienst auf dem Host eingerichtet sein.
        </p>
        <div style={{ display: "flex", gap: 16 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input
              type="radio"
              name="kanal"
              checked={status.kanal === "stable"}
              disabled={speichert}
              onChange={() => kanalAendern("stable")}
            />
            Stable
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input
              type="radio"
              name="kanal"
              checked={status.kanal === "beta"}
              disabled={speichert}
              onChange={() => kanalAendern("beta")}
            />
            Beta
          </label>
        </div>
      </div>

      <div className="karte" style={{ marginTop: 16 }}>
        <h2>Versionsstatus</h2>
        {fehler && <p className="fehlertext">{fehler}</p>}
        {status.fehler && <p className="fehlertext">{status.fehler}</p>}
        <div className="tabelle-scroll">
        <table>
          <tbody>
            <tr>
              <td>
                <strong>Installierte Version</strong>
              </td>
              <td>{status.installierte_version}</td>
            </tr>
            <tr>
              <td>
                <strong>Verfügbare Version ({status.kanal})</strong>
              </td>
              <td>{status.verfuegbare_version ?? "–"}</td>
            </tr>
            {status.veroeffentlicht_am && (
              <tr>
                <td>
                  <strong>Veröffentlicht am</strong>
                </td>
                <td>{new Date(status.veroeffentlicht_am).toLocaleDateString("de-DE")}</td>
              </tr>
            )}
          </tbody>
        </table>
        </div>

        {status.update_verfuegbar ? (
          <>
            <p style={{ marginTop: "1rem" }}>
              🆕 Es ist eine neue Version verfügbar.{" "}
              {status.release_url && (
                <a href={status.release_url} target="_blank" rel="noreferrer">
                  Release-Hinweise ansehen
                </a>
              )}
            </p>
            <button onClick={updateInstallieren} disabled={installiert} style={{ marginTop: "0.5rem" }}>
              {installiert ? "Update wird angestoßen …" : "Update installieren"}
            </button>
          </>
        ) : (
          !status.fehler && <p style={{ marginTop: "1rem", color: "var(--farbe-text-mute)" }}>Du bist auf dem neuesten Stand.</p>
        )}

        {installMeldung && (
          <p style={{ marginTop: "1rem", color: "var(--farbe-text-mute)" }}>{installMeldung}</p>
        )}

        <div>
          <button className="sekundaer" onClick={laden} style={{ marginTop: "1rem" }}>
            Erneut prüfen
          </button>
        </div>
      </div>
    </div>
  );
}
