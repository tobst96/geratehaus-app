import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/** Schützt Admin-only-Seiten (Personal, Stammdaten, Barcodes,
 * Kiosk-Geräte, Benachrichtigungen, Einstellungen) zusätzlich zu
 * GruppenfuehrerRoute – Gruppenführer werden zum Dashboard zurückgeschickt,
 * falls sie die URL direkt aufrufen. */
export function AdminRoute() {
  const { gruppenfuehrerRolle } = useAuth();
  if (gruppenfuehrerRolle !== "admin") {
    return <Navigate to="/gruppenfuehrer/dashboard" replace />;
  }
  return <Outlet />;
}
