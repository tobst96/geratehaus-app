import { Fehlertext } from "../../components/Fehlertext";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { holeDashboard, type DashboardOut } from "../../api/gruppenfuehrer";
import { ApiError } from "../../api/client";
import { Banner } from "../../components/Banner";
import { Ladeanzeige } from "../../components/Ladeanzeige";
import { texte } from "../../i18n/texte";

export function Dashboard() {
  const t = texte.dashboard;
  const navigate = useNavigate();
  const [daten, setDaten] = useState<DashboardOut | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);

  useEffect(() => {
    holeDashboard()
      .then(setDaten)
      .catch((err) => setFehler(err instanceof ApiError ? String(err.detail) : t.ladefehler));

    const timer = setInterval(() => {
      holeDashboard()
        .then(setDaten)
        .catch(() => {});
    }, 60_000);
    return () => clearInterval(timer);
  }, []);

  if (fehler) return <Fehlertext>{fehler}</Fehlertext>;
  if (!daten) return <Ladeanzeige />;

  const maxAnzahl = Math.max(1, ...daten.einsaetze_pro_monat.map((m) => m.anzahl));

  return (
    <div>
      <h1>{t.titel}</h1>

      {daten.migration_hinweis && (
        <Banner art="hinweis">
          {t.migration_hinweis_text}{" "}
          <a href="/gruppenfuehrer/personal">{t.migration_hinweis_link}</a>
        </Banner>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
        <div
          className="karte"
          onClick={() => navigate("/gruppenfuehrer/buchungen")}
          style={{ cursor: "pointer" }}
          title={t.zu_buchungen}
        >
          <div style={{ fontSize: "2rem", fontWeight: 700 }}>{daten.offene_buchungen_anzahl}</div>
          <div>{t.offene_buchungen}</div>
        </div>
        <div
          className="karte"
          onClick={() => navigate("/gruppenfuehrer/listen?tab=Dienststunden")}
          style={{ cursor: "pointer" }}
          title={t.zu_dienststunden}
        >
          <div style={{ fontSize: "2rem", fontWeight: 700 }}>
            {daten.schwellenwert_ueberschreitungen.length}
          </div>
          <div>{t.schwellenwert_ueberschreitungen}</div>
        </div>
      </div>

      <h2
        onClick={() => navigate("/gruppenfuehrer/listen?tab=Dienststunden")}
        style={{ cursor: "pointer" }}
        title={t.zu_dienststunden}
      >
        {t.schwellenwert_ueberschreitungen}
      </h2>
      <div className="tabelle-scroll">
      <table>
        <thead>
          <tr>
            <th>{t.th_name}</th>
            <th>{t.th_funktion}</th>
            <th>{t.th_stunden}</th>
            <th>{t.th_schwellenwert}</th>
          </tr>
        </thead>
        <tbody>
          {daten.schwellenwert_ueberschreitungen.length === 0 ? (
            <tr><td colSpan={4} className="text-mute">{t.keine_ueberschreitungen}</td></tr>
          ) : (
            daten.schwellenwert_ueberschreitungen.map((s, i) => (
              <tr key={i}>
                <td>{s.person_name}</td>
                <td>{s.funktion_name}</td>
                <td>{s.summe_stunden}</td>
                <td>{s.schwellenwert_stunden}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      </div>

      <h2>{t.einsaetze_pro_monat}</h2>
      <div className="karte">
        {daten.einsaetze_pro_monat.length === 0 && <p>{t.keine_daten}</p>}
        {daten.einsaetze_pro_monat.map((m) => (
          <div key={m.monat} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ width: 64, fontSize: "0.85rem" }}>{m.monat}</span>
            <div
              style={{
                background: "var(--farbe-primaer)",
                height: 18,
                width: `${(m.anzahl / maxAnzahl) * 100}%`,
                minWidth: 4,
                borderRadius: 4,
              }}
            />
            <span style={{ fontSize: "0.85rem" }}>{m.anzahl}</span>
          </div>
        ))}
      </div>

    </div>
  );
}
