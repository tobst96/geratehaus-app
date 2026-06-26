import { useNavigate } from "react-router-dom";
import { useConfig } from "../context/ConfigContext";
import { KACHEL_ICONS, type KachelModulKey } from "./kachelIcons";
import "./KioskHome.css";

type ActionKey = KachelModulKey;

const ACTIONS: Record<ActionKey, { label: string; route: string; icon: JSX.Element }> = {
  einsatzbericht: { label: "Einsatzbericht", route: "/einsatztagebuch", icon: KACHEL_ICONS.einsatzbericht },
  dienstbuch: { label: "Dienstbuch", route: "/dienstbuch", icon: KACHEL_ICONS.dienstbuch },
  dienststunden: { label: "Dienststunden", route: "/dienststunden", icon: KACHEL_ICONS.dienststunden },
  fahrzeugbuchung: { label: "Fahrzeugbuchung", route: "/fahrzeugbuchung", icon: KACHEL_ICONS.fahrzeugbuchung },
};

function startseiteFlags(config: ReturnType<typeof useConfig>["config"]) {
  return {
    einsatzbericht: config?.modul_einsatztagebuch_aktiv && config?.modul_einsatztagebuch_startseite,
    dienstbuch: config?.modul_dienstbuch_aktiv && config?.modul_dienstbuch_startseite,
    dienststunden: config?.modul_dienststunden_aktiv && config?.modul_dienststunden_startseite,
    fahrzeugbuchung: config?.modul_fahrzeugbuchung_aktiv && config?.modul_fahrzeugbuchung_startseite,
  };
}

export function KioskHome() {
  const navigate = useNavigate();
  const { config } = useConfig();
  const flags = startseiteFlags(config);
  const sichtbareAktionen = (Object.keys(ACTIONS) as ActionKey[]).filter((key) => flags[key]);

  return (
    <div className="kiosk-container">
      <div className="kiosk-header">
        <h1 className="kiosk-title">
          Gerätehaus<span className="kiosk-title-accent">.app</span>
        </h1>
        <p className="kiosk-subtitle">Was möchtest du machen?</p>
      </div>

      <div className="kiosk-grid">
        {sichtbareAktionen.map((key) => {
          const action = ACTIONS[key];
          return (
            <button key={key} className="kiosk-tile" onClick={() => navigate(action.route)}>
              <div className="kiosk-tile-icon-badge">{action.icon}</div>
              <div className="kiosk-tile-text">{action.label}</div>
            </button>
          );
        })}
      </div>

      <svg className="kiosk-wave" viewBox="0 0 1440 140" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M0,80 C360,160 1080,0 1440,80 L1440,140 L0,140 Z" fill="var(--farbe-primaer)" />
      </svg>
    </div>
  );
}
