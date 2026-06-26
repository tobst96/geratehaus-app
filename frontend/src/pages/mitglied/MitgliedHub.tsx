import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useConfig } from "../../context/ConfigContext";

const MODULE = [
  { aktivKey: "modul_einsatztagebuch_aktiv", aussenKey: "modul_einsatztagebuch_aussenzugriff", route: "/einsatztagebuch", label: "Einsatzbericht" },
  { aktivKey: "modul_dienstbuch_aktiv", aussenKey: "modul_dienstbuch_aussenzugriff", route: "/dienstbuch", label: "Dienstbuch" },
  { aktivKey: "modul_dienststunden_aktiv", aussenKey: "modul_dienststunden_aussenzugriff", route: "/dienststunden", label: "Dienststunden" },
  { aktivKey: "modul_fahrzeugbuchung_aktiv", aussenKey: "modul_fahrzeugbuchung_aussenzugriff", route: "/fahrzeugbuchung", label: "Fahrzeugbuchung" },
] as const;

export function MitgliedHub() {
  const { angezeigterName } = useAuth();
  const { config } = useConfig();

  const sichtbar = MODULE.filter((m) => config?.[m.aktivKey] && config?.[m.aussenKey]);

  return (
    <div className="seite">
      <div className="karte">
        <h1>Willkommen{angezeigterName ? `, ${angezeigterName}` : ""}!</h1>
        <p style={{ color: "#666" }}>
          Hier sind die Module, die der Admin für den Mitglieder-Login freigegeben hat.
        </p>
      </div>

      {sichtbar.length === 0 ? (
        <p style={{ color: "#666" }}>
          Aktuell sind keine Module für den Mitglieder-Login freigegeben. Bitte den Admin ansprechen.
        </p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
          {sichtbar.map((m) => (
            <Link key={m.route} to={m.route} className="karte" style={{ textAlign: "center", textDecoration: "none" }}>
              <strong>{m.label}</strong>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
