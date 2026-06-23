import { Navigate, Outlet } from "react-router-dom";
import { istPinLokalVerifiziert } from "../api/pinSession";

/** Reine UX-Abkürzung: verhindert, dass die Außenbereich-Seiten kurz
 * aufblitzen, bevor der erste 403 vom Server kommt. Die eigentliche
 * Absicherung ist serverseitig das signierte PIN-Session-Cookie – dieser
 * lokale Flag hat keine Sicherheitsfunktion. */
export function AussenRoute() {
  if (!istPinLokalVerifiziert()) {
    return <Navigate to="/aussen/login" replace />;
  }
  return <Outlet />;
}
