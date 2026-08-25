import { Fehlertext } from "../../components/Fehlertext";
import { useCallback, useEffect, useState } from "react";
import { formatiereDatum } from "../../utils/datum";
import { holeUpdateStatus, updateAusloesen, updateKanalSetzen, type UpdateStatus } from "../../api/gruppenfuehrer";
import { ApiError } from "../../api/client";
import { Ladeanzeige } from "../../components/Ladeanzeige";
import { texte } from "../../i18n/texte";

export function Update() {
  const t = texte.update;
  const [status, setStatus] = useState<UpdateStatus | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [speichert, setSpeichert] = useState(false);
  const [installiert, setInstalliert] = useState(false);
  const [installMeldung, setInstallMeldung] = useState<string | null>(null);

  // useCallback stabilisiert laden, sonst würde die Aufnahme in die
  // useEffect-Deps unten bei jedem Render einen neuen Effektlauf auslösen
  // (Endlosschleife über setStatus -> Re-Render -> neue laden-Referenz).
  const laden = useCallback(async () => {
    try {
      setStatus(await holeUpdateStatus());
      setFehler(null);
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : t.ladefehler);
    }
  }, [t.ladefehler]);

  useEffect(() => {
    laden();
  }, [laden]);

  async function updateInstallieren(istUpgrade: boolean) {
    if (!confirm(istUpgrade ? t.installieren_confirm : t.wechseln_confirm)) return;
    setInstalliert(true);
    setInstallMeldung(null);
    try {
      const ergebnis = await updateAusloesen();
      setInstallMeldung(ergebnis.meldung);
      setFehler(null);
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : t.ausloesen_fehler);
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
      setFehler(err instanceof ApiError ? String(err.detail) : t.kanal_fehler);
    } finally {
      setSpeichert(false);
    }
  }

  if (fehler && !status) return <Fehlertext>{fehler}</Fehlertext>;
  if (!status) return <Ladeanzeige />;

  return (
    <div>
      <h1>{t.titel}</h1>

      <div className="karte">
        <h2>{t.kanal_titel}</h2>
        <p className="text-mute">
          "Stable" zeigt nur fertige Veröffentlichungen an, "Beta" auch Vorabversionen. Ist eine
          neue Version verfügbar, kann sie unten per Klick installiert werden – auch beim Wechsel
          zwischen den Kanälen wird direkt die für den gewählten Kanal aktuellste Version zum
          Installieren angeboten. Vor jedem Update erstellt der Server automatisch ein Backup. Das
          Update selbst wird von einem Skript auf dem Server ausgeführt (<code>git fetch</code> +
          Checkout der Zielversion + <code>docker compose up -d --build</code>); dazu muss{" "}
          <code>scripts/updater.sh</code> einmalig als Cronjob/systemd-Dienst auf dem Host
          eingerichtet sein.
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
            {t.stable}
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input
              type="radio"
              name="kanal"
              checked={status.kanal === "beta"}
              disabled={speichert}
              onChange={() => kanalAendern("beta")}
            />
            {t.beta}
          </label>
        </div>
      </div>

      <div className="karte" style={{ marginTop: 16 }}>
        <h2>{t.versionsstatus}</h2>
        {fehler && <Fehlertext>{fehler}</Fehlertext>}
        {status.fehler && <Fehlertext>{status.fehler}</Fehlertext>}
        <div className="tabelle-scroll">
        <table>
          <tbody>
            <tr>
              <td>
                <strong>{t.installierte_version}</strong>
              </td>
              <td>{status.installierte_version}</td>
            </tr>
            <tr>
              <td>
                <strong>{t.verfuegbare_version} ({status.kanal})</strong>
              </td>
              <td>{status.verfuegbare_version ?? "–"}</td>
            </tr>
            {status.veroeffentlicht_am && (
              <tr>
                <td>
                  <strong>{t.veroeffentlicht_am}</strong>
                </td>
                <td>{formatiereDatum(status.veroeffentlicht_am)}</td>
              </tr>
            )}
          </tbody>
        </table>
        </div>

        {status.installierbar ? (
          <>
            <p style={{ marginTop: "1rem" }}>
              {status.update_verfuegbar ? t.neue_version_verfuegbar : t.andere_version_verfuegbar}{" "}
              {status.release_url && (
                <a href={status.release_url} target="_blank" rel="noreferrer">
                  {t.release_hinweise}
                </a>
              )}
            </p>
            <button
              onClick={() => updateInstallieren(status.update_verfuegbar)}
              disabled={installiert}
              style={{ marginTop: "0.5rem" }}
            >
              {installiert ? t.installieren_laeuft : status.update_verfuegbar ? t.installieren : t.wechseln}
            </button>
          </>
        ) : (
          !status.fehler && <p style={{ marginTop: "1rem", color: "var(--farbe-text-mute)" }}>{t.aktuell}</p>
        )}

        {installMeldung && (
          <p style={{ marginTop: "1rem", color: "var(--farbe-text-mute)" }}>{installMeldung}</p>
        )}

        <div>
          <button className="sekundaer" onClick={laden} style={{ marginTop: "1rem" }}>
            {t.erneut_pruefen}
          </button>
        </div>
      </div>
    </div>
  );
}
