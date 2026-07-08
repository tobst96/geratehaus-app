import { Fehlertext } from "../../components/Fehlertext";
import { useEffect, useState } from "react";
import { formatiereDatumZeit } from "../../utils/datum";
import { holeSystemStatus, type SystemStatus } from "../../api/meta";
import { ApiError } from "../../api/client";
import { Ladeanzeige } from "../../components/Ladeanzeige";

function Ampel({ ok, text }: { ok: boolean | null; text?: string }) {
  const farbe = ok === null ? "var(--farbe-text-mute)" : ok ? "#2e9e4f" : "#d13438";
  const symbol = ok === null ? "–" : ok ? "●" : "●";
  return (
    <span style={{ color: farbe, fontWeight: 600 }}>
      {symbol} {text ?? (ok === null ? "n/v" : ok ? "OK" : "Fehler")}
    </span>
  );
}

function Zeile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        padding: "6px 0",
        borderBottom: "1px solid var(--farbe-rand)",
      }}
    >
      <span className="text-mute">{label}</span>
      <span style={{ textAlign: "right" }}>{children}</span>
    </div>
  );
}

export function Systemstatus() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [laedt, setLaedt] = useState(false);

  async function laden() {
    setLaedt(true);
    try {
      setStatus(await holeSystemStatus());
      setFehler(null);
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Status konnte nicht geladen werden.");
    } finally {
      setLaedt(false);
    }
  }

  useEffect(() => {
    laden();
  }, []);

  if (fehler) return <Fehlertext>{fehler}</Fehlertext>;
  if (!status) return <Ladeanzeige />;

  return (
    <div>
      <div className="flex-zwischen">
        <h1 style={{ margin: 0 }}>Systemstatus</h1>
        <button type="button" className="sekundaer" onClick={laden} disabled={laedt}>
          {laedt ? "Aktualisiere …" : "Aktualisieren"}
        </button>
      </div>
      <p className="hinweistext">
        Betriebsstatus der Kern-Dienste und geplanten Hintergrund-Jobs. Nur für Admins sichtbar –
        hilft beim Self-Hosting-Support.
      </p>

      <div className="karte">
        <h2>Dienste</h2>
        <Zeile label="Version">{status.version}</Zeile>
        <Zeile label="Datenbank">
          <Ampel ok={status.datenbank.ok} />
        </Zeile>
        <Zeile label="E-Mail (SMTP)">
          {status.smtp.konfiguriert ? (
            <Ampel
              ok={status.smtp.aktiv}
              text={status.smtp.aktiv ? `aktiv · ${status.smtp.host}` : `konfiguriert · ${status.smtp.host}`}
            />
          ) : (
            <Ampel ok={null} text="nicht konfiguriert" />
          )}
        </Zeile>
        <Zeile label="Objektspeicher (MinIO)">
          {status.minio.aktiv ? (
            <Ampel ok={status.minio.erreichbar} text={status.minio.erreichbar ? "erreichbar" : "nicht erreichbar"} />
          ) : (
            <Ampel ok={null} text="inaktiv" />
          )}
        </Zeile>
        <Zeile label="Divera">
          {status.divera.modul_aktiv ? (
            <Ampel
              ok={status.divera.api_key_gesetzt}
              text={status.divera.api_key_gesetzt ? "aktiv · API-Key gesetzt" : "aktiv · kein API-Key"}
            />
          ) : (
            <Ampel ok={null} text="inaktiv" />
          )}
        </Zeile>
      </div>

      <div className="karte">
        <h2>
          Hintergrund-Jobs{" "}
          <span style={{ fontSize: "0.85rem", fontWeight: 400 }}>
            (<Ampel ok={status.scheduler.laeuft} text={status.scheduler.laeuft ? "läuft" : "gestoppt"} />)
          </span>
        </h2>
        {status.scheduler.jobs.length === 0 ? (
          <p className="text-mute">Keine geplanten Jobs.</p>
        ) : (
          <div className="tabelle-scroll">
            <table>
              <thead>
                <tr>
                  <th>Job</th>
                  <th>Nächster Lauf</th>
                </tr>
              </thead>
              <tbody>
                {status.scheduler.jobs.map((j) => (
                  <tr key={j.id}>
                    <td>{j.id}</td>
                    <td>
                      {j.naechster_lauf
                        ? formatiereDatumZeit(j.naechster_lauf)
                        : "–"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
