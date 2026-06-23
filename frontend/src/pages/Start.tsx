import { Link } from "react-router-dom";
import { useConfig } from "../context/ConfigContext";

export function Start() {
  const { config } = useConfig();
  if (!config) return null;

  const kacheln = [
    config.modul_einsatztagebuch_aktiv && {
      pfad: "/einsatztagebuch",
      titel: "Einsatztagebuch",
    },
    config.modul_dienstbuch_aktiv && { pfad: "/dienstbuch", titel: "Dienstbuch" },
    config.modul_dienststunden_aktiv && { pfad: "/dienststunden", titel: "Dienststunden" },
    config.modul_fahrzeugbuchung_aktiv && {
      pfad: "/fahrzeugbuchung",
      titel: "Fahrzeugbuchung",
    },
  ].filter(Boolean) as { pfad: string; titel: string }[];

  return (
    <div>
      <h1>{config.organisation_name}</h1>
      <p>Wähle einen Bereich:</p>
      <div className="kachel-raster">
        {kacheln.map((k) => (
          <Link key={k.pfad} to={k.pfad} className="kachel">
            {k.titel}
          </Link>
        ))}
      </div>

      <p style={{ marginTop: 32 }}>
        <Link to="/pin-einrichten">PIN einrichten</Link> (nur im Gerätehaus) ·{" "}
        <Link to="/aussen/login">Ich bin nicht im Gerätehaus</Link>
      </p>
    </div>
  );
}
