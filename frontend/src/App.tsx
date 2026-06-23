import { Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ModeratorRoute } from "./components/ModeratorRoute";
import { SetupGate } from "./components/SetupGate";
import { AussenRoute } from "./components/AussenRoute";
import { KioskHome } from "./pages/KioskHome";
import { Datenschutz } from "./pages/Datenschutz";
import { NotFound } from "./pages/NotFound";
import { ModeratorLogin } from "./pages/moderator/ModeratorLogin";
import { ModeratorLayout } from "./pages/moderator/ModeratorLayout";
import { Dashboard } from "./pages/moderator/Dashboard";
import { Listen } from "./pages/moderator/Listen";
import { Buchungsmanagement } from "./pages/moderator/Buchungsmanagement";
import { Stammdaten } from "./pages/moderator/Stammdaten";
import { Einstellungen } from "./pages/moderator/Einstellungen";
import { SetupWizard } from "./pages/setup/SetupWizard";
import { PinEinrichten } from "./pages/PinEinrichten";
import { AussenLogin } from "./pages/aussen/AussenLogin";
import { AussenHub } from "./pages/aussen/AussenHub";
import { AussenFahrzeugbuchung } from "./pages/aussen/AussenFahrzeugbuchung";
import { AussenDienststunden } from "./pages/aussen/AussenDienststunden";
import { Einsatztagebuch } from "./pages/einsatztagebuch/Einsatztagebuch";
import { EinsatzDetail } from "./pages/einsatztagebuch/EinsatzDetail";
import { Dienstbuch } from "./pages/dienstbuch/Dienstbuch";
import { Dienststunden } from "./pages/dienststunden/Dienststunden";
import { Fahrzeugbuchung } from "./pages/fahrzeugbuchung/Fahrzeugbuchung";

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
              <Route path="buchungen" element={<Buchungsmanagement />} />
              <Route path="stammdaten" element={<Stammdaten />} />
              <Route path="einstellungen" element={<Einstellungen />} />
            </Route>
          </Route>

          <Route path="/pin-einrichten" element={<PinEinrichten />} />
          <Route path="/einsatztagebuch" element={<Einsatztagebuch />} />
          <Route path="/einsatztagebuch/:id" element={<EinsatzDetail />} />
          <Route path="/dienstbuch" element={<Dienstbuch />} />
          <Route path="/dienststunden" element={<Dienststunden />} />
          <Route path="/fahrzeugbuchung" element={<Fahrzeugbuchung />} />

          <Route path="/aussen/login" element={<AussenLogin />} />
          <Route element={<AussenRoute />}>
            <Route path="/aussen" element={<AussenHub />} />
            <Route path="/aussen/fahrzeugbuchung" element={<AussenFahrzeugbuchung />} />
            <Route path="/aussen/dienststunden" element={<AussenDienststunden />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </SetupGate>
  );
}
