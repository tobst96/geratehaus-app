import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

// "admin: false" = auch für Gruppenführer sichtbar (Einsatzberichte,
// Dienstbucheinträge, Fahrzeugreservierungen, Punkte-Belohnung). "admin: true"
// = nur Admin (Personal, Stammdaten, Barcodes, Benachrichtigungen, Einstellungen).
// Punkte selbst ist für alle Moderatoren erreichbar, die Regel-Einstellungen
// auf der Seite sind dort zusätzlich frontend-seitig auf Admin beschränkt.
const NAV_ITEMS = [
  { pfad: "/moderator/dashboard", titel: "Dashboard", admin: false },
  { pfad: "/moderator/listen", titel: "Listen", admin: false },
  { pfad: "/moderator/buchungen", titel: "Buchungen", admin: false },
  { pfad: "/moderator/punkte", titel: "Punkte", admin: false },
  { pfad: "/moderator/personal", titel: "Personal", admin: true },
  { pfad: "/moderator/stammdaten", titel: "Stammdaten", admin: true },
  { pfad: "/moderator/barcodes", titel: "Barcodes", admin: true },
  { pfad: "/moderator/kiosk-geraete", titel: "Kiosk-Geräte", admin: true },
  { pfad: "/moderator/benachrichtigungen", titel: "Benachrichtigungen", admin: true },
  { pfad: "/moderator/einstellungen", titel: "Einstellungen", admin: true },
  { pfad: "/moderator/update", titel: "Update", admin: true },
];

export function ModeratorLayout() {
  const { moderatorAbmelden, moderatorRolle } = useAuth();
  const navigate = useNavigate();
  const istAdmin = moderatorRolle === "admin";
  const sichtbareNavItems = NAV_ITEMS.filter((item) => !item.admin || istAdmin);
  const [menuOffen, setMenuOffen] = useState(false);

  function abmelden() {
    moderatorAbmelden();
    navigate("/");
  }

  return (
    <div>
      <nav className="moderator-nav">
        <button
          type="button"
          className="moderator-hamburger"
          onClick={() => setMenuOffen((o) => !o)}
          aria-label="Navigation öffnen"
          aria-expanded={menuOffen}
        >
          {menuOffen ? "✕" : "☰"}
        </button>
        <div className={`moderator-nav-links${menuOffen ? " offen" : ""}`}>
          {sichtbareNavItems.map((item) => (
            <NavLink
              key={item.pfad}
              to={item.pfad}
              className={({ isActive }) => `moderator-nav-link${isActive ? " aktiv" : ""}`}
              onClick={() => setMenuOffen(false)}
            >
              {item.titel}
            </NavLink>
          ))}
        </div>
        <button className="sekundaer moderator-abmelden" onClick={abmelden}>
          Abmelden
        </button>
      </nav>
      <Outlet />
    </div>
  );
}
