import { Fehlertext } from "../../components/Fehlertext";
import { useCallback, useEffect, useState } from "react";
import { formatiereDatumZeit } from "../../utils/datum";
import { holeSystemStatus, type SystemStatus } from "../../api/meta";
import { ApiError } from "../../api/client";
import { Ladeanzeige } from "../../components/Ladeanzeige";
import { texte } from "../../i18n/texte";

function Ampel({ ok, text }: { ok: boolean | null; text?: string }) {
  const farbe = ok === null ? "var(--farbe-text-mute)" : ok ? "#2e9e4f" : "#d13438";
  const symbol = ok === null ? "–" : ok ? "●" : "●";
  return (
    <span style={{ color: farbe, fontWeight: 600 }}>
      {symbol} {text ?? (ok === null ? texte.systemstatus.nv : ok ? texte.systemstatus.ok : texte.systemstatus.fehler)}
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
  const t = texte.systemstatus;
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [laedt, setLaedt] = useState(false);

  // useCallback stabilisiert laden, sonst würde die Aufnahme in die
  // useEffect-Deps unten bei jedem Render einen neuen Effektlauf auslösen
  // (Endlosschleife über setStatus -> Re-Render -> neue laden-Referenz).
  const laden = useCallback(async () => {
    setLaedt(true);
    try {
      setStatus(await holeSystemStatus());
      setFehler(null);
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : t.ladefehler);
    } finally {
      setLaedt(false);
    }
  }, [t.ladefehler]);

  useEffect(() => {
    laden();
  }, [laden]);

  if (fehler) return <Fehlertext>{fehler}</Fehlertext>;
  if (!status) return <Ladeanzeige />;

  return (
    <div>
      <div className="flex-zwischen">
        <h1 style={{ margin: 0 }}>{t.titel}</h1>
        <button type="button" className="sekundaer" onClick={laden} disabled={laedt}>
          {laedt ? t.aktualisieren_laeuft : t.aktualisieren}
        </button>
      </div>
      <p className="hinweistext">
{t.intro}
      </p>

      <div className="karte">
        <h2>{t.dienste}</h2>
        <Zeile label={t.version}>{status.version}</Zeile>
        <Zeile label={t.datenbank}>
          <Ampel ok={status.datenbank.ok} />
        </Zeile>
        <Zeile label={t.email_smtp}>
          {status.smtp.konfiguriert ? (
            <Ampel
              ok={status.smtp.aktiv}
              text={status.smtp.aktiv ? `${t.aktiv} · ${status.smtp.host}` : `${t.konfiguriert} · ${status.smtp.host}`}
            />
          ) : (
            <Ampel ok={null} text={t.nicht_konfiguriert} />
          )}
        </Zeile>
        <Zeile label={t.objektspeicher}>
          {status.minio.aktiv ? (
            <Ampel ok={status.minio.erreichbar} text={status.minio.erreichbar ? t.erreichbar : t.nicht_erreichbar} />
          ) : (
            <Ampel ok={null} text={t.inaktiv} />
          )}
        </Zeile>
        <Zeile label={t.divera}>
          {status.divera.modul_aktiv ? (
            <Ampel
              ok={status.divera.api_key_gesetzt}
              text={status.divera.api_key_gesetzt ? t.api_key_gesetzt : t.kein_api_key}
            />
          ) : (
            <Ampel ok={null} text={t.inaktiv} />
          )}
        </Zeile>
      </div>

      <div className="karte">
        <h2>
          {t.hintergrund_jobs}{" "}
          <span style={{ fontSize: "0.85rem", fontWeight: 400 }}>
            (<Ampel ok={status.scheduler.laeuft} text={status.scheduler.laeuft ? t.laeuft : t.gestoppt} />)
          </span>
        </h2>
        {status.scheduler.jobs.length === 0 ? (
          <p className="text-mute">{t.keine_jobs}</p>
        ) : (
          <div className="tabelle-scroll">
            <table>
              <thead>
                <tr>
                  <th>{t.th_job}</th>
                  <th>{t.th_naechster_lauf}</th>
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
