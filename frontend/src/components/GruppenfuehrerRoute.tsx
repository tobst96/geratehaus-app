import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function GruppenfuehrerRoute() {
  const { gruppenfuehrerAngemeldet } = useAuth();
  if (!gruppenfuehrerAngemeldet) {
    return <Navigate to="/gruppenfuehrer/login" replace />;
  }
  return <Outlet />;
}
