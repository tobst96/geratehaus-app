import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/** Schützt eine Moderator-Seite anhand des individuellen Modul-Zugriffs
 * (`hat_zugriff`) statt der Rolle. Admins passieren immer (Backend-Bypass).
 * Zugriff wird gewährt, wenn der Moderator MINDESTENS EINEN der `modulKeys`
 * besitzt (z. B. Einstellungen/Module/Update teilen sich den Key
 * „einstellungen"). Solange die eigenen Rechte noch nicht geladen sind, wird
 * nichts gerendert (kein kurzzeitiges Wegnavigieren). */
export function BerechtigungRoute({ modulKeys }: { modulKeys: string[] }) {
  const { berechtigungenGeladen, hatModulZugriff } = useAuth();
  if (!berechtigungenGeladen) return null;
  if (modulKeys.some((k) => hatModulZugriff(k))) {
    return <Outlet />;
  }
  return <Navigate to="/moderator/dashboard" replace />;
}
