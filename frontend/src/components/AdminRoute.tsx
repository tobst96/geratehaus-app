import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/** Schützt Admin-only-Seiten (Personal, Punkte, Stammdaten, Barcodes,
 * Kiosk-Geräte, Benachrichtigungen, Einstellungen) zusätzlich zu
 * ModeratorRoute – Gruppenführer werden zum Dashboard zurückgeschickt,
 * falls sie die URL direkt aufrufen. */
export function AdminRoute() {
  const { moderatorRolle } = useAuth();
  if (moderatorRolle !== "admin") {
    return <Navigate to="/moderator/dashboard" replace />;
  }
  return <Outlet />;
}
