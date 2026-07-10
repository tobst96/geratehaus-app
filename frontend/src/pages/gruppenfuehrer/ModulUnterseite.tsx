import { Fehlertext } from "../../components/Fehlertext";
import { Link, Navigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { permFuerModulUnterseite } from "./modulRechte";
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
import { FormularModul } from "./module/FormularModul";
import { PresseberichtModul } from "./module/PresseberichtModul";
import { texte } from "../../i18n/texte";

export function ModulUnterseite() {
  const { key } = useParams<{ key: string }>();
  const t = texte.modul_unterseite;
  const { gruppenfuehrerRolle, hatModulZugriff, berechtigungenGeladen } = useAuth();
  const istAdmin = gruppenfuehrerRolle === "admin";

  // Zugriff: Admins immer. Sonst braucht eine grantbare Unterseite ihr eigenes
  // Recht; alle übrigen Unterseiten (Backup/MinIO/Modul-Einstellungen …) bleiben
  // wie bisher an "einstellungen" gebunden.
  if (!berechtigungenGeladen) return null;
  if (!istAdmin) {
    const perm = permFuerModulUnterseite(key);
    const erlaubt = perm ? hatModulZugriff(perm) : hatModulZugriff("einstellungen");
    if (!erlaubt) return <Navigate to="/gruppenfuehrer/dashboard" replace />;
  }

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
    case "formular":
      return <FormularModul />;
    case "pressebericht":
      return <PresseberichtModul />;
    default:
      return (
        <div>
          <p>
            <Link to="/gruppenfuehrer/module">{t.zurueck}</Link>
          </p>
          <Fehlertext>{t.unbekannt}</Fehlertext>
        </div>
      );
  }
}
