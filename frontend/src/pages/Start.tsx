import { Link } from "react-router-dom";
import { useConfig } from "../context/ConfigContext";
import { texte } from "../i18n/texte";

export function Start() {
  const { config } = useConfig();
  if (!config) return null;
  const t = texte.start;

  const kacheln = [
    config.modul_einsatztagebuch_aktiv && {
      pfad: "/einsatztagebuch",
      titel: t.kacheln.einsatztagebuch,
    },
    config.modul_dienstbuch_aktiv && { pfad: "/dienstbuch", titel: t.kacheln.dienstbuch },
    config.modul_dienststunden_aktiv && { pfad: "/dienststunden", titel: t.kacheln.dienststunden },
    config.modul_fahrzeugbuchung_aktiv && {
      pfad: "/fahrzeugbuchung",
      titel: t.kacheln.fahrzeugbuchung,
    },
  ].filter(Boolean) as { pfad: string; titel: string }[];

  return (
    <div>
      <h1>{config.organisation_name}</h1>
      <p>{t.frage}</p>
      <div className="kachel-raster">
        {kacheln.map((k) => (
          <Link key={k.pfad} to={k.pfad} className="kachel">
            {k.titel}
          </Link>
        ))}
      </div>

      <p style={{ marginTop: 32 }}>
        <Link to="/pin-einrichten">{t.pin_einrichten}</Link> {t.nur_geraetehaus} ·{" "}
        <Link to="/aussen/login">{t.nicht_im_geraetehaus}</Link>
      </p>
    </div>
  );
}
