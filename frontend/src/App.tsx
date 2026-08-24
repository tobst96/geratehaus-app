import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { GruppenfuehrerRoute } from "./components/GruppenfuehrerRoute";
import { AdminRoute } from "./components/AdminRoute";
import { BerechtigungRoute } from "./components/BerechtigungRoute";
import { SetupGate } from "./components/SetupGate";
import { KioskGate } from "./components/KioskGate";
import { Ladeanzeige } from "./components/Ladeanzeige";
import { LandingPage } from "./pages/LandingPage";
import { Datenschutz } from "./pages/Datenschutz";
import { Impressum } from "./pages/Impressum";
import { NotFound } from "./pages/NotFound";

// Code-Splitting: Alles außer der schlanken Kiosk-/Landing-Startseite (oben
// eager importiert) lädt erst bei tatsächlicher Navigation dorthin - sonst
// zieht schon die einfache Kiosk-Startseite Bibliotheken mit, die nur auf
// einzelnen Unterseiten gebraucht werden (Kalender, Barcode-Scanner, Setup-
// Wizard, gesamter Admin-Bereich). `.then(m => ({ default: m.X }))`, weil die
// Seiten benannte statt Default-Exports nutzen (React.lazy braucht einen
// Default-Export je Modul).
const GruppenfuehrerLogin = lazy(() =>
  import("./pages/gruppenfuehrer/GruppenfuehrerLogin").then((m) => ({ default: m.GruppenfuehrerLogin }))
);
const GruppenfuehrerLayout = lazy(() =>
  import("./pages/gruppenfuehrer/GruppenfuehrerLayout").then((m) => ({ default: m.GruppenfuehrerLayout }))
);
const Dashboard = lazy(() =>
  import("./pages/gruppenfuehrer/Dashboard").then((m) => ({ default: m.Dashboard }))
);
const Listen = lazy(() => import("./pages/gruppenfuehrer/Listen").then((m) => ({ default: m.Listen })));
const Buchungsmanagement = lazy(() =>
  import("./pages/gruppenfuehrer/Buchungsmanagement").then((m) => ({ default: m.Buchungsmanagement }))
);
const KioskGeraete = lazy(() =>
  import("./pages/gruppenfuehrer/KioskGeraete").then((m) => ({ default: m.KioskGeraete }))
);
const EinsatzDetailGruppenfuehrer = lazy(() =>
  import("./pages/gruppenfuehrer/EinsatzDetailGruppenfuehrer").then((m) => ({
    default: m.EinsatzDetailGruppenfuehrer,
  }))
);
const DienstbuchDetailGruppenfuehrer = lazy(() =>
  import("./pages/gruppenfuehrer/DienstbuchDetailGruppenfuehrer").then((m) => ({
    default: m.DienstbuchDetailGruppenfuehrer,
  }))
);
const Einstellungen = lazy(() =>
  import("./pages/gruppenfuehrer/Einstellungen").then((m) => ({ default: m.Einstellungen }))
);
const Update = lazy(() => import("./pages/gruppenfuehrer/Update").then((m) => ({ default: m.Update })));
const Module = lazy(() => import("./pages/gruppenfuehrer/Module").then((m) => ({ default: m.Module })));
const ModulUnterseite = lazy(() =>
  import("./pages/gruppenfuehrer/ModulUnterseite").then((m) => ({ default: m.ModulUnterseite }))
);
const Berechtigungen = lazy(() =>
  import("./pages/gruppenfuehrer/Berechtigungen").then((m) => ({ default: m.Berechtigungen }))
);
const AuditLog = lazy(() => import("./pages/gruppenfuehrer/AuditLog").then((m) => ({ default: m.AuditLog })));
const Systemstatus = lazy(() =>
  import("./pages/gruppenfuehrer/Systemstatus").then((m) => ({ default: m.Systemstatus }))
);
const BarcodeGenerator = lazy(() =>
  import("./pages/gruppenfuehrer/BarcodeGenerator").then((m) => ({ default: m.BarcodeGenerator }))
);
const NotifierEinstellungen = lazy(() =>
  import("./pages/gruppenfuehrer/NotifierEinstellungen").then((m) => ({ default: m.NotifierEinstellungen }))
);
const SetupWizard = lazy(() => import("./pages/setup/SetupWizard").then((m) => ({ default: m.SetupWizard })));
const MitgliedLogin = lazy(() =>
  import("./pages/mitglied/MitgliedLogin").then((m) => ({ default: m.MitgliedLogin }))
);
const MitgliedHub = lazy(() => import("./pages/mitglied/MitgliedHub").then((m) => ({ default: m.MitgliedHub })));
const Einsatztagebuch = lazy(() =>
  import("./pages/einsatztagebuch/Einsatztagebuch").then((m) => ({ default: m.Einsatztagebuch }))
);
const EinsatzDetail = lazy(() =>
  import("./pages/einsatztagebuch/EinsatzDetail").then((m) => ({ default: m.EinsatzDetail }))
);
const Dienstbuch = lazy(() => import("./pages/dienstbuch/Dienstbuch").then((m) => ({ default: m.Dienstbuch })));
const FormularListe = lazy(() =>
  import("./pages/formular/FormularListe").then((m) => ({ default: m.FormularListe }))
);
const FormularAusfuellen = lazy(() =>
  import("./pages/formular/FormularAusfuellen").then((m) => ({ default: m.FormularAusfuellen }))
);
const Dienststunden = lazy(() =>
  import("./pages/dienststunden/Dienststunden").then((m) => ({ default: m.Dienststunden }))
);
const Fahrzeugbuchung = lazy(() =>
  import("./pages/fahrzeugbuchung/Fahrzeugbuchung").then((m) => ({ default: m.Fahrzeugbuchung }))
);
const FahrzeugView = lazy(() => import("./pages/fahrzeug/FahrzeugView").then((m) => ({ default: m.FahrzeugView })));
const ManuelleEintragung = lazy(() =>
  import("./pages/ManuelleEintragung").then((m) => ({ default: m.ManuelleEintragung }))
);
const DienstbuchManuelleEintragung = lazy(() =>
  import("./pages/DienstbuchManuelleEintragung").then((m) => ({ default: m.DienstbuchManuelleEintragung }))
);
const DienststundenManuelleEintragung = lazy(() =>
  import("./pages/DienststundenManuelleEintragung").then((m) => ({
    default: m.DienststundenManuelleEintragung,
  }))
);
const DienststundenStempel = lazy(() =>
  import("./pages/DienststundenStempel").then((m) => ({ default: m.DienststundenStempel }))
);
const FahrzeugbuchungManuelleEintragung = lazy(() =>
  import("./pages/FahrzeugbuchungManuelleEintragung").then((m) => ({
    default: m.FahrzeugbuchungManuelleEintragung,
  }))
);
const PersonBildHochladen = lazy(() =>
  import("./pages/PersonBildHochladen").then((m) => ({ default: m.PersonBildHochladen }))
);
const ElwUpload = lazy(() => import("./pages/ElwUpload").then((m) => ({ default: m.ElwUpload })));
const PinSetzen = lazy(() => import("./pages/PinSetzen").then((m) => ({ default: m.PinSetzen })));
const PasswortSetzen = lazy(() => import("./pages/PasswortSetzen").then((m) => ({ default: m.PasswortSetzen })));
const PersonFreigabe = lazy(() =>
  import("./pages/PersonFreigabe").then((m) => ({ default: m.PersonFreigabe }))
);

export function App() {
  return (
    <SetupGate>
      <Suspense fallback={<Ladeanzeige />}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/setup" element={<SetupWizard />} />
            <Route path="/" element={<LandingPage />} />
            <Route path="/kiosk/:token" element={<KioskGate />} />
            <Route path="/datenschutz" element={<Datenschutz />} />
            <Route path="/impressum" element={<Impressum />} />
            <Route path="/gruppenfuehrer/login" element={<GruppenfuehrerLogin />} />
            <Route path="/mitglied/login" element={<MitgliedLogin />} />
            <Route path="/mitglied" element={<MitgliedHub />} />

            <Route path="/gruppenfuehrer" element={<GruppenfuehrerRoute />}>
              <Route element={<GruppenfuehrerLayout />}>
                <Route index element={<Navigate to="/gruppenfuehrer/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="listen" element={<Listen />} />
                {/* Gruppenführer-Arbeitsbereiche granular gegated (Backend:
                    require_modul_zugriff, Admins via Bypass). Die Listen-Seite selbst
                    filtert ihre Tabs pro Recht. */}
                <Route element={<BerechtigungRoute modulKeys={["einsatztagebuch"]} />}>
                  <Route path="einsaetze/:id" element={<EinsatzDetailGruppenfuehrer />} />
                </Route>
                <Route element={<BerechtigungRoute modulKeys={["dienstbuch"]} />}>
                  <Route path="dienstbuecher/:id" element={<DienstbuchDetailGruppenfuehrer />} />
                </Route>
                <Route element={<BerechtigungRoute modulKeys={["fahrzeugbuchung"]} />}>
                  <Route path="buchungen" element={<Buchungsmanagement />} />
                </Route>
                {/* Noch admin-only (Backend nutzt CurrentAdmin): Barcodes,
                    Kiosk-Geräte, Benachrichtigungen. */}
                <Route element={<AdminRoute />}>
                  <Route path="benachrichtigungen" element={<NotifierEinstellungen />} />
                  <Route path="audit" element={<AuditLog />} />
                  <Route path="systemstatus" element={<Systemstatus />} />
                </Route>
                {/* Granular schaltbar (Backend: require_modul_zugriff, Admins via Bypass). */}
                <Route element={<BerechtigungRoute modulKeys={["barcodes"]} />}>
                  <Route path="barcodes" element={<BarcodeGenerator />} />
                </Route>
                <Route element={<BerechtigungRoute modulKeys={["kiosk-geraete"]} />}>
                  <Route path="kiosk-geraete" element={<KioskGeraete />} />
                </Route>
                {/* Backend granular über require_modul_zugriff geschützt – hier
                    individuell per hat_zugriff statt Rolle (Admins via Bypass). */}
                <Route element={<BerechtigungRoute modulKeys={["einstellungen"]} />}>
                  <Route path="einstellungen" element={<Einstellungen />} />
                  <Route path="module" element={<Module />} />
                  <Route path="update" element={<Update />} />
                </Route>
                {/* Modul-Unterseiten prüfen den Zugriff pro Modul-Key selbst
                    (grantbare Bereiche für berechtigte Gruppenführer, sonst einstellungen). */}
                <Route path="module/:key" element={<ModulUnterseite />} />
                <Route element={<BerechtigungRoute modulKeys={["berechtigungen"]} />}>
                  <Route path="berechtigungen" element={<Berechtigungen />} />
                </Route>
              </Route>
            </Route>

            <Route path="/einsatztagebuch" element={<Einsatztagebuch />} />
            <Route path="/einsatztagebuch/:id" element={<EinsatzDetail />} />
            <Route path="/dienstbuch" element={<Dienstbuch />} />
            <Route path="/dienststunden" element={<Dienststunden />} />
            <Route path="/dienststunden-stempel/:funktionId" element={<DienststundenStempel />} />
            <Route path="/fahrzeugbuchung" element={<Fahrzeugbuchung />} />
            <Route path="/formulare" element={<FormularListe />} />
            <Route path="/formular/:id" element={<FormularAusfuellen />} />
            <Route path="/fahrzeug/:token" element={<FahrzeugView />} />
            <Route path="/eintragen/:token" element={<ManuelleEintragung />} />
            <Route path="/eintragen-dienstbuch/:token" element={<DienstbuchManuelleEintragung />} />
            <Route
              path="/eintragen-dienststunden/:token"
              element={<DienststundenManuelleEintragung />}
            />
            <Route path="/person-bild/:token" element={<PersonBildHochladen />} />
            <Route path="/elw-upload/:token" element={<ElwUpload />} />
            <Route path="/pin-setzen/:token" element={<PinSetzen />} />
            <Route path="/passwort-setzen/:token" element={<PasswortSetzen />} />
            <Route path="/person-freigabe/:token" element={<PersonFreigabe />} />
            <Route
              path="/eintragen-fahrzeugbuchung/:token"
              element={<FahrzeugbuchungManuelleEintragung />}
            />

            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </SetupGate>
  );
}
