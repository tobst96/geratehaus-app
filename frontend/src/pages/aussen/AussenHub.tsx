import { Link } from "react-router-dom";
import { useConfig } from "../../context/ConfigContext";

export function AussenHub() {
  const { config } = useConfig();

  return (
    <div>
      <h1>Außerhalb des Gerätehauses</h1>
      <p>Diese Bereiche sind ohne Standort-Check erreichbar:</p>
      <div className="kachel-raster">
        {config?.modul_fahrzeugbuchung_aktiv && (
          <Link to="/aussen/fahrzeugbuchung" className="kachel">
            Fahrzeugkalender
          </Link>
        )}
        {config?.modul_dienststunden_aktiv && (
          <Link to="/aussen/dienststunden" className="kachel">
            Meine Dienststunden
          </Link>
        )}
      </div>
    </div>
  );
}
