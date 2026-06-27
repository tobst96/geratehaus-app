import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { holeDashboard, type DashboardOut } from "../../api/moderator";
import { ApiError } from "../../api/client";
import { Ladeanzeige } from "../../components/Ladeanzeige";

export function Dashboard() {
  const navigate = useNavigate();
  const [daten, setDaten] = useState<DashboardOut | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);

  useEffect(() => {
    holeDashboard()
      .then(setDaten)
      .catch((err) => setFehler(err instanceof ApiError ? String(err.detail) : "Dashboard konnte nicht geladen werden."));

    const timer = setInterval(() => {
      holeDashboard()
        .then(setDaten)
        .catch(() => {});
    }, 60_000);
    return () => clearInterval(timer);
  }, []);

  if (fehler) return <p className="fehlertext">{fehler}</p>;
  if (!daten) return <Ladeanzeige />;

  const maxAnzahl = Math.max(1, ...daten.einsaetze_pro_monat.map((m) => m.anzahl));

  return (
    <div>
      <h1>Dashboard</h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
        <div
          className="karte"
          onClick={() => navigate("/moderator/buchungen")}
          style={{ cursor: "pointer" }}
          title="Zu den Buchungen"
        >
          <div style={{ fontSize: "2rem", fontWeight: 700 }}>{daten.offene_buchungen_anzahl}</div>
          <div>Offene Buchungen</div>
        </div>
        <div
          className="karte"
          onClick={() => navigate("/moderator/listen?tab=Dienststunden")}
          style={{ cursor: "pointer" }}
          title="Zu Listen → Dienststunden"
        >
          <div style={{ fontSize: "2rem", fontWeight: 700 }}>
            {daten.schwellenwert_ueberschreitungen.length}
          </div>
          <div>Schwellenwert-Überschreitungen</div>
        </div>
      </div>

      <h2>Einsätze pro Monat</h2>
      <div className="karte">
        {daten.einsaetze_pro_monat.length === 0 && <p>Keine Daten.</p>}
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

      <h2>Rangliste nach Punkten</h2>
      <div className="tabelle-scroll">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Punkte</th>
          </tr>
        </thead>
        <tbody>
          {daten.punkte_rangliste.map((t) => (
            <tr key={t.person_id}>
              <td>{t.person_name}</td>
              <td>{t.punkte}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      <h2>Schwellenwert-Überschreitungen</h2>
      <div className="tabelle-scroll">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Funktion</th>
            <th>Stunden</th>
            <th>Schwellenwert</th>
          </tr>
        </thead>
        <tbody>
          {daten.schwellenwert_ueberschreitungen.map((s, i) => (
            <tr key={i}>
              <td>{s.person_name}</td>
              <td>{s.funktion_name}</td>
              <td>{s.summe_stunden}</td>
              <td>{s.schwellenwert_stunden}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
