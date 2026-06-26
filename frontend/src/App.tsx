import { Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ModeratorRoute } from "./components/ModeratorRoute";
import { AdminRoute } from "./components/AdminRoute";
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
import { Personal } from "./pages/moderator/Personal";
import { PunkteEinstellungen } from "./pages/moderator/PunkteEinstellungen";
import { Stammdaten } from "./pages/moderator/Stammdaten";
import { KioskGeraete } from "./pages/moderator/KioskGeraete";
import { EinsatzDetailModerator } from "./pages/moderator/EinsatzDetailModerator";
import { DienstbuchDetailModerator } from "./pages/moderator/DienstbuchDetailModerator";
import { Einstellungen } from "./pages/moderator/Einstellungen";
import { Update } from "./pages/moderator/Update";
import { BarcodeGenerator } from "./pages/moderator/BarcodeGenerator";
import { NotifierEinstellungen } from "./pages/moderator/NotifierEinstellungen";
import { SetupWizard } from "./pages/setup/SetupWizard";
import { MitgliedLogin } from "./pages/mitglied/MitgliedLogin";
import { MitgliedHub } from "./pages/mitglied/MitgliedHub";
import { MitgliedAnmelden } from "./pages/mitglied/MitgliedAnmelden";
import { Einsatztagebuch } from "./pages/einsatztagebuch/Einsatztagebuch";
import { EinsatzDetail } from "./pages/einsatztagebuch/EinsatzDetail";
import { Dienstbuch } from "./pages/dienstbuch/Dienstbuch";
import { Dienststunden } from "./pages/dienststunden/Dienststunden";
import { Fahrzeugbuchung } from "./pages/fahrzeugbuchung/Fahrzeugbuchung";
import { FahrzeugView } from "./pages/fahrzeug/FahrzeugView";
import { ManuelleEintragung } from "./pages/ManuelleEintragung";
import { DienstbuchManuelleEintragung } from "./pages/DienstbuchManuelleEintragung";
import { DienststundenManuelleEintragung } from "./pages/DienststundenManuelleEintragung";
import { FahrzeugbuchungManuelleEintragung } from "./pages/FahrzeugbuchungManuelleEintragung";
import { PersonBildHochladen } from "./pages/PersonBildHochladen";

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
              <Route path="einsaetze/:id" element={<EinsatzDetailModerator />} />
              <Route path="dienstbuecher/:id" element={<DienstbuchDetailModerator />} />
              <Route path="buchungen" element={<Buchungsmanagement />} />
              {/* Punkte: für jeden Moderator erreichbar (Gruppenführer können
                  Belohnungen vergeben), die Regel-Einstellungen auf der Seite
                  selbst bleiben dabei admin-only (siehe PunkteEinstellungen.tsx). */}
              <Route path="punkte" element={<PunkteEinstellungen />} />
              <Route element={<AdminRoute />}>
                <Route path="personal" element={<Personal />} />
                <Route path="stammdaten" element={<Stammdaten />} />
                <Route path="barcodes" element={<BarcodeGenerator />} />
                <Route path="kiosk-geraete" element={<KioskGeraete />} />
                <Route path="benachrichtigungen" element={<NotifierEinstellungen />} />
                <Route path="einstellungen" element={<Einstellungen />} />
                <Route path="update" element={<Update />} />
              </Route>
            </Route>
          </Route>

          <Route path="/einsatztagebuch" element={<Einsatztagebuch />} />
          <Route path="/einsatztagebuch/:id" element={<EinsatzDetail />} />
          <Route path="/dienstbuch" element={<Dienstbuch />} />
          <Route path="/dienststunden" element={<Dienststunden />} />
          <Route path="/fahrzeugbuchung" element={<Fahrzeugbuchung />} />
          <Route path="/fahrzeug/:token" element={<FahrzeugView />} />
          <Route path="/eintragen/:token" element={<ManuelleEintragung />} />
          <Route path="/eintragen-dienstbuch/:token" element={<DienstbuchManuelleEintragung />} />
          <Route
            path="/eintragen-dienststunden/:token"
            element={<DienststundenManuelleEintragung />}
          />
          <Route path="/person-bild/:token" element={<PersonBildHochladen />} />
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
