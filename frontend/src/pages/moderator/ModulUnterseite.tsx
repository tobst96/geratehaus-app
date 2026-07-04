import { Link, useParams } from "react-router-dom";
import { DiveraModul } from "./module/DiveraModul";
import { EinsatztagebuchModul } from "./module/EinsatztagebuchModul";
import { DienstbuchModul } from "./module/DienstbuchModul";
import { DienststundenModul } from "./module/DienststundenModul";
import { FahrzeugbuchungModul } from "./module/FahrzeugbuchungModul";
import { FahrzeugeModul } from "./module/FahrzeugeModul";
import { PersonalModul } from "./module/PersonalModul";
import { BarcodeModul } from "./module/BarcodeModul";
import { BenachrichtigungenModul } from "./module/BenachrichtigungenModul";
import { KioskModul } from "./module/KioskModul";
import { BackupModul } from "./module/BackupModul";
import { MinioModul } from "./module/MinioModul";

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
    case "personal":
      return <PersonalModul />;
    case "fahrzeuge":
      return <FahrzeugeModul />;
    case "barcode":
      return <BarcodeModul />;
    case "benachrichtigungen":
      return <BenachrichtigungenModul />;
    case "kiosk":
      return <KioskModul />;
    case "backup":
      return <BackupModul />;
    case "minio":
      return <MinioModul />;
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
