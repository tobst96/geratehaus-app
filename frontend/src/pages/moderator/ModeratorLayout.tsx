import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const NAV_ITEMS = [
  { pfad: "/moderator/dashboard", titel: "Dashboard" },
  { pfad: "/moderator/listen", titel: "Listen" },
  { pfad: "/moderator/buchungen", titel: "Buchungen" },
  { pfad: "/moderator/stammdaten", titel: "Stammdaten" },
  { pfad: "/moderator/barcodes", titel: "Barcodes" },
  { pfad: "/moderator/benachrichtigungen", titel: "Benachrichtigungen" },
  { pfad: "/moderator/einstellungen", titel: "Einstellungen" },
];

export function ModeratorLayout() {
  const { moderatorAbmelden } = useAuth();
  const navigate = useNavigate();

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
        {NAV_ITEMS.map((item) => (
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
