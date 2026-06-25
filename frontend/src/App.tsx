import { Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ModeratorRoute } from "./components/ModeratorRoute";
import { SetupGate } from "./components/SetupGate";
import { KioskHome } from "./pages/KioskHome";
import { Datenschutz } from "./pages/Datenschutz";
import { NotFound } from "./pages/NotFound";
import { ModeratorLogin } from "./pages/moderator/ModeratorLogin";
import { ModeratorLayout } from "./pages/moderator/ModeratorLayout";
import { Dashboard } from "./pages/moderator/Dashboard";
import { Listen } from "./pages/moderator/Listen";
import { Buchungsmanagement } from "./pages/moderator/Buchungsmanagement";
import { Personal } from "./pages/moderator/Personal";
import { Stammdaten } from "./pages/moderator/Stammdaten";
import { EinsatzDetailModerator } from "./pages/moderator/EinsatzDetailModerator";
import { Einstellungen } from "./pages/moderator/Einstellungen";
import { BarcodeGenerator } from "./pages/moderator/BarcodeGenerator";
import { NotifierEinstellungen } from "./pages/moderator/NotifierEinstellungen";
import { SetupWizard } from "./pages/setup/SetupWizard";
import { Einsatztagebuch } from "./pages/einsatztagebuch/Einsatztagebuch";
import { EinsatzDetail } from "./pages/einsatztagebuch/EinsatzDetail";
import { Dienstbuch } from "./pages/dienstbuch/Dienstbuch";
import { Dienststunden } from "./pages/dienststunden/Dienststunden";
import { Fahrzeugbuchung } from "./pages/fahrzeugbuchung/Fahrzeugbuchung";
import { FahrzeugView } from "./pages/fahrzeug/FahrzeugView";
import { ManuelleEintragung } from "./pages/ManuelleEintragung";
import { DienstbuchManuelleEintragung } from "./pages/DienstbuchManuelleEintragung";
import { DienststundenManuelleEintragung } from "./pages/DienststundenManuelleEintragung";

export function App() {
  return (
    <SetupGate>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/setup" element={<SetupWizard />} />
          <Route path="/" element={<KioskHome />} />
          <Route path="/datenschutz" element={<Datenschutz />} />
          <Route path="/moderator/login" element={<ModeratorLogin />} />

          <Route path="/moderator" element={<ModeratorRoute />}>
            <Route element={<ModeratorLayout />}>
              <Route index element={<Navigate to="/moderator/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="listen" element={<Listen />} />
              <Route path="einsaetze/:id" element={<EinsatzDetailModerator />} />
              <Route path="buchungen" element={<Buchungsmanagement />} />
              <Route path="personal" element={<Personal />} />
              <Route path="stammdaten" element={<Stammdaten />} />
              <Route path="barcodes" element={<BarcodeGenerator />} />
              <Route path="benachrichtigungen" element={<NotifierEinstellungen />} />
              <Route path="einstellungen" element={<Einstellungen />} />
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

          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </SetupGate>
  );
}
