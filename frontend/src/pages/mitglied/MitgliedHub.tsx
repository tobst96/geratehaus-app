import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useConfig } from "../../context/ConfigContext";
import { KACHEL_ICONS, type KachelModulKey } from "../kachelIcons";
import "../KioskHome.css";

const MODULE: { key: KachelModulKey; aktivKey: string; aussenKey: string; route: string; label: string }[] = [
  { key: "einsatzbericht", aktivKey: "modul_einsatztagebuch_aktiv", aussenKey: "modul_einsatztagebuch_aussenzugriff", route: "/einsatztagebuch", label: "Einsatzbericht" },
  { key: "dienstbuch", aktivKey: "modul_dienstbuch_aktiv", aussenKey: "modul_dienstbuch_aussenzugriff", route: "/dienstbuch", label: "Dienstbuch" },
  { key: "dienststunden", aktivKey: "modul_dienststunden_aktiv", aussenKey: "modul_dienststunden_aussenzugriff", route: "/dienststunden", label: "Dienststunden" },
  { key: "fahrzeugbuchung", aktivKey: "modul_fahrzeugbuchung_aktiv", aussenKey: "modul_fahrzeugbuchung_aussenzugriff", route: "/fahrzeugbuchung", label: "Fahrzeugbuchung" },
];

export function MitgliedHub() {
  const navigate = useNavigate();
  const { angezeigterName } = useAuth();
  const { config } = useConfig();

  const sichtbar = MODULE.filter(
    (m) => (config as Record<string, unknown> | null)?.[m.aktivKey] && (config as Record<string, unknown> | null)?.[m.aussenKey]
  );

  return (
    <div className="kiosk-container">
      <div className="kiosk-header">
        <h1 className="kiosk-title">
          Willkommen<span className="kiosk-title-accent">{angezeigterName ? `, ${angezeigterName}` : ""}</span>
        </h1>
        <p className="kiosk-subtitle">Was möchtest du machen?</p>
      </div>

      {sichtbar.length === 0 ? (
        <p style={{ color: "#666", zIndex: 2 }}>
          Aktuell sind keine Module für den Mitglieder-Login freigegeben. Bitte den Admin ansprechen.
        </p>
      ) : (
        <div className="kiosk-grid">
          {sichtbar.map((m) => (
            <button key={m.route} className="kiosk-tile" onClick={() => navigate(m.route)}>
              <div className="kiosk-tile-icon-badge">{KACHEL_ICONS[m.key]}</div>
              <div className="kiosk-tile-text">{m.label}</div>
            </button>
          ))}
        </div>
      )}

      <svg className="kiosk-wave" viewBox="0 0 1440 140" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M0,80 C360,160 1080,0 1440,80 L1440,140 L0,140 Z" fill="var(--farbe-primaer)" />
      </svg>
    </div>
  );
}
