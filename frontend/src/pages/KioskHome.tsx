import { useNavigate } from "react-router-dom";
import { KACHEL_ICONS, type KachelModulKey } from "./kachelIcons";
import "./KioskHome.css";

type ActionKey = KachelModulKey;

const ACTIONS: Record<ActionKey, { label: string; route: string; icon: JSX.Element }> = {
  einsatzbericht: { label: "Einsatzbericht", route: "/einsatztagebuch", icon: KACHEL_ICONS.einsatzbericht },
  dienstbuch: { label: "Dienstbuch", route: "/dienstbuch", icon: KACHEL_ICONS.dienstbuch },
  dienststunden: { label: "Dienststunden", route: "/dienststunden", icon: KACHEL_ICONS.dienststunden },
  fahrzeugbuchung: { label: "Fahrzeugbuchung", route: "/fahrzeugbuchung", icon: KACHEL_ICONS.fahrzeugbuchung },
  formulare: { label: "Formulare", route: "/formulare", icon: KACHEL_ICONS.formulare },
};

// Der Server liefert Feature-Modul-Keys; das Einsatztagebuch heißt als Kachel
// „einsatzbericht".
const MODUL_KEY_ZU_ACTION: Record<string, ActionKey> = {
  einsatztagebuch: "einsatzbericht",
  dienstbuch: "dienstbuch",
  dienststunden: "dienststunden",
  fahrzeugbuchung: "fahrzeugbuchung",
  formular: "formulare",
};

export function KioskHome({ module }: { module: string[] }) {
  const navigate = useNavigate();
  const sichtbareAktionen = module
    .map((k) => MODUL_KEY_ZU_ACTION[k])
    .filter((a): a is ActionKey => Boolean(a));

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
