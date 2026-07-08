import { Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ModeratorRoute } from "./components/ModeratorRoute";
import { AdminRoute } from "./components/AdminRoute";
import { BerechtigungRoute } from "./components/BerechtigungRoute";
import { SetupGate } from "./components/SetupGate";
import { KioskGate } from "./components/KioskGate";
import { LandingPage } from "./pages/LandingPage";
import { Datenschutz } from "./pages/Datenschutz";
import { NotFound } from "./pages/NotFound";
import { ModeratorLogin } from "./pages/moderator/ModeratorLogin";
import { ModeratorLayout } from "./pages/moderator/ModeratorLayout";
import { Dashboard } from "./pages/moderator/Dashboard";
import { Listen } from "./pages/moderator/Listen";
import { Buchungsmanagement } from "./pages/moderator/Buchungsmanagement";
import { KioskGeraete } from "./pages/moderator/KioskGeraete";
import { EinsatzDetailModerator } from "./pages/moderator/EinsatzDetailModerator";
import { DienstbuchDetailModerator } from "./pages/moderator/DienstbuchDetailModerator";
import { Einstellungen } from "./pages/moderator/Einstellungen";
import { Update } from "./pages/moderator/Update";
import { Module } from "./pages/moderator/Module";
import { ModulUnterseite } from "./pages/moderator/ModulUnterseite";
import { Berechtigungen } from "./pages/moderator/Berechtigungen";
import { AuditLog } from "./pages/moderator/AuditLog";
import { Systemstatus } from "./pages/moderator/Systemstatus";
import { BarcodeGenerator } from "./pages/moderator/BarcodeGenerator";
import { NotifierEinstellungen } from "./pages/moderator/NotifierEinstellungen";
import { SetupWizard } from "./pages/setup/SetupWizard";
import { MitgliedLogin } from "./pages/mitglied/MitgliedLogin";
import { MitgliedHub } from "./pages/mitglied/MitgliedHub";
import { MitgliedAnmelden } from "./pages/mitglied/MitgliedAnmelden";
import { Einsatztagebuch } from "./pages/einsatztagebuch/Einsatztagebuch";
import { EinsatzDetail } from "./pages/einsatztagebuch/EinsatzDetail";
import { Dienstbuch } from "./pages/dienstbuch/Dienstbuch";
import { FormularListe } from "./pages/formular/FormularListe";
import { FormularAusfuellen } from "./pages/formular/FormularAusfuellen";
import { Dienststunden } from "./pages/dienststunden/Dienststunden";
import { Fahrzeugbuchung } from "./pages/fahrzeugbuchung/Fahrzeugbuchung";
import { FahrzeugView } from "./pages/fahrzeug/FahrzeugView";
import { ManuelleEintragung } from "./pages/ManuelleEintragung";
import { DienstbuchManuelleEintragung } from "./pages/DienstbuchManuelleEintragung";
import { DienststundenManuelleEintragung } from "./pages/DienststundenManuelleEintragung";
import { DienststundenStempel } from "./pages/DienststundenStempel";
import { FahrzeugbuchungManuelleEintragung } from "./pages/FahrzeugbuchungManuelleEintragung";
import { PersonBildHochladen } from "./pages/PersonBildHochladen";
import { PinSetzen } from "./pages/PinSetzen";
import { PersonFreigabe } from "./pages/PersonFreigabe";

export function App() {
  return (
    <SetupGate>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/setup" element={<SetupWizard />} />
          <Route path="/" element={<LandingPage />} />
          <Route path="/kiosk/:token" element={<KioskGate />} />
          <Route path="/datenschutz" element={<Datenschutz />} />
          <Route path="/moderator/login" element={<ModeratorLogin />} />
          <Route path="/mitglied/login" element={<MitgliedLogin />} />
          <Route path="/mitglied" element={<MitgliedHub />} />
          <Route path="/mitglied-anmelden/:token" element={<MitgliedAnmelden />} />

          <Route path="/moderator" element={<ModeratorRoute />}>
            <Route element={<ModeratorLayout />}>
              <Route index element={<Navigate to="/moderator/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="listen" element={<Listen />} />
              {/* Moderator-Arbeitsbereiche granular gegated (Backend:
                  require_modul_zugriff, Admins via Bypass). Die Listen-Seite selbst
                  filtert ihre Tabs pro Recht. */}
              <Route element={<BerechtigungRoute modulKeys={["einsatztagebuch"]} />}>
                <Route path="einsaetze/:id" element={<EinsatzDetailModerator />} />
              </Route>
              <Route element={<BerechtigungRoute modulKeys={["dienstbuch"]} />}>
                <Route path="dienstbuecher/:id" element={<DienstbuchDetailModerator />} />
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
          <Route path="/pin-setzen/:token" element={<PinSetzen />} />
          <Route path="/person-freigabe/:token" element={<PersonFreigabe />} />
          <Route
            path="/eintragen-fahrzeugbuchung/:token"
            element={<FahrzeugbuchungManuelleEintragung />}
          />

          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </SetupGate>
  );
}
