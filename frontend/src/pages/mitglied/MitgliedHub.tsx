import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useConfig } from "../../context/ConfigContext";
import { holeMeinProfil } from "../../api/auth";
import { KACHEL_ICONS, type KachelModulKey } from "../kachelIcons";
import { PushAktivierung } from "../../components/PushAktivierung";
import { InstallPrompt } from "../../components/InstallPrompt";

const MODULE: { key: KachelModulKey; aktivKey: string; aussenKey: string; route: string; label: string }[] = [
  { key: "einsatzbericht", aktivKey: "modul_einsatztagebuch_aktiv", aussenKey: "modul_einsatztagebuch_aussenzugriff", route: "/einsatztagebuch", label: "Einsatzbericht" },
  { key: "dienstbuch", aktivKey: "modul_dienstbuch_aktiv", aussenKey: "modul_dienstbuch_aussenzugriff", route: "/dienstbuch", label: "Dienstbuch" },
  { key: "dienststunden", aktivKey: "modul_dienststunden_aktiv", aussenKey: "modul_dienststunden_aussenzugriff", route: "/dienststunden", label: "Dienststunden" },
  { key: "fahrzeugbuchung", aktivKey: "modul_fahrzeugbuchung_aktiv", aussenKey: "modul_fahrzeugbuchung_aussenzugriff", route: "/fahrzeugbuchung", label: "Fahrzeugbuchung" },
  { key: "formulare", aktivKey: "modul_formular_aktiv", aussenKey: "modul_formular_aussenzugriff", route: "/formulare", label: "Formulare" },
];

function initialen(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((t) => t.charAt(0))
    .join("")
    .toUpperCase();
}

export function MitgliedHub() {
  const navigate = useNavigate();
  const { angezeigterName, mitgliedAbmelden } = useAuth();
  const { config } = useConfig();
  const [bildUrl, setBildUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!angezeigterName) return;
    let abbruch = false;
    holeMeinProfil()
      .then((p) => {
        if (!abbruch) setBildUrl(p.bild_url);
      })
      .catch(() => {});
    return () => {
      abbruch = true;
    };
  }, [angezeigterName]);

  const sichtbar = MODULE.filter(
    (m) => (config as Record<string, unknown> | null)?.[m.aktivKey] && (config as Record<string, unknown> | null)?.[m.aussenKey]
  );

  async function abmelden() {
    await mitgliedAbmelden();
    navigate("/");
  }

  return (
    <div className="mitglied-hub">
      {angezeigterName && (
        <div className="mitglied-profil">
          {bildUrl ? (
            <img src={bildUrl} alt={angezeigterName} className="mitglied-avatar mitglied-avatar-bild" />
          ) : (
            <div className="mitglied-avatar">{initialen(angezeigterName)}</div>
          )}
          <div className="mitglied-profil-name">{angezeigterName}</div>
          <button type="button" className="mitglied-abmelden-link" onClick={abmelden}>
            Abmelden
          </button>
        </div>
      )}

      {angezeigterName && (
        <>
          <InstallPrompt />
          <PushAktivierung />
        </>
      )}

      <h2 className="mitglied-frage">Was möchtest du machen?</h2>

      {sichtbar.length === 0 ? (
        <p className="text-mute">
          Aktuell sind keine Module für den Mitglieder-Login freigegeben. Bitte den Admin ansprechen.
        </p>
      ) : (
        <div className="mitglied-grid">
          {sichtbar.map((m) => (
            <button
              key={m.route}
              type="button"
              className="mitglied-tile"
              onClick={() => navigate(m.route, { state: { mitgliedModus: true } })}
            >
              <span className="mitglied-tile-icon">{KACHEL_ICONS[m.key]}</span>
              <span className="mitglied-tile-label">{m.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
