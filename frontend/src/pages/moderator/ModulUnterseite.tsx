import { Link, useParams } from "react-router-dom";
import { DiveraModul } from "./module/DiveraModul";
import { EinsatztagebuchModul } from "./module/EinsatztagebuchModul";
import { DienstbuchModul } from "./module/DienstbuchModul";
import { DienststundenModul } from "./module/DienststundenModul";
import { FahrzeugbuchungModul } from "./module/FahrzeugbuchungModul";

export function ModulUnterseite() {
  const { key } = useParams<{ key: string }>();

  switch (key) {
    case "einsatztagebuch":
      return <EinsatztagebuchModul />;
    case "dienstbuch":
      return <DienstbuchModul />;
    case "dienststunden":
      return <DienststundenModul />;
    case "fahrzeugbuchung":
      return <FahrzeugbuchungModul />;
    case "divera":
      return <DiveraModul />;
    default:
      return (
        <div>
          <p>
            <Link to="/moderator/module">← Zurück zu den Modulen</Link>
          </p>
          <p className="fehlertext">Unbekanntes Modul.</p>
        </div>
      );
  }
}
