import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

// "admin: false" = auch für Gruppenführer sichtbar (Einsatzberichte,
// Dienstbucheinträge, Fahrzeugreservierungen). "admin: true" = nur Admin
// (Personal, Punkte, Stammdaten, Barcodes, Benachrichtigungen, Einstellungen).
const NAV_ITEMS = [
  { pfad: "/moderator/dashboard", titel: "Dashboard", admin: false },
  { pfad: "/moderator/listen", titel: "Listen", admin: false },
  { pfad: "/moderator/buchungen", titel: "Buchungen", admin: false },
  { pfad: "/moderator/personal", titel: "Personal", admin: true },
  { pfad: "/moderator/punkte", titel: "Punkte", admin: true },
  { pfad: "/moderator/stammdaten", titel: "Stammdaten", admin: true },
  { pfad: "/moderator/barcodes", titel: "Barcodes", admin: true },
  { pfad: "/moderator/kiosk-geraete", titel: "Kiosk-Geräte", admin: true },
  { pfad: "/moderator/benachrichtigungen", titel: "Benachrichtigungen", admin: true },
  { pfad: "/moderator/einstellungen", titel: "Einstellungen", admin: true },
];

export function ModeratorLayout() {
  const { moderatorAbmelden, moderatorRolle } = useAuth();
  const navigate = useNavigate();
  const istAdmin = moderatorRolle === "admin";
  const sichtbareNavItems = NAV_ITEMS.filter((item) => !item.admin || istAdmin);

  function abmelden() {
    moderatorAbmelden();
    navigate("/");
  }

  return (
    <div>
      <nav
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 24,
          borderBottom: "1px solid #e0e0e0",
          paddingBottom: 12,
        }}
      >
        {sichtbareNavItems.map((item) => (
          <NavLink
            key={item.pfad}
            to={item.pfad}
            style={({ isActive }) => ({
              fontWeight: isActive ? 700 : 400,
              textDecoration: "none",
              padding: "6px 10px",
            })}
          >
            {item.titel}
          </NavLink>
        ))}
        <button className="sekundaer" style={{ marginLeft: "auto" }} onClick={abmelden}>
          Abmelden
        </button>
      </nav>
      <Outlet />
    </div>
  );
}
