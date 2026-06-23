import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function ModeratorRoute() {
  const { moderatorAngemeldet } = useAuth();
  if (!moderatorAngemeldet) {
    return <Navigate to="/moderator/login" replace />;
  }
  return <Outlet />;
}
