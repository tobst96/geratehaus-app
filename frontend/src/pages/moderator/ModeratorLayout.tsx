import { Fragment, useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { holeFeatureModule, type FeatureModul } from "../../api/featureModule";

// "admin: false" = auch für Gruppenführer sichtbar (Einsatzberichte,
// Dienstbucheinträge, Fahrzeugreservierungen). "admin: true" = nur Admin
// (Personal, Stammdaten, Barcodes, Benachrichtigungen, Einstellungen).
const NAV_ITEMS = [
  { pfad: "/moderator/dashboard", titel: "Dashboard", admin: false },
  { pfad: "/moderator/listen", titel: "Listen", admin: false },
  { pfad: "/moderator/buchungen", titel: "Buchungen", admin: false },
  { pfad: "/moderator/personal", titel: "Personal", admin: true },
  { pfad: "/moderator/stammdaten", titel: "Stammdaten", admin: true },
  { pfad: "/moderator/barcodes", titel: "Barcodes", admin: true },
  { pfad: "/moderator/kiosk-geraete", titel: "Kiosk-Geräte", admin: true },
  { pfad: "/moderator/benachrichtigungen", titel: "Benachrichtigungen", admin: true },
  { pfad: "/moderator/einstellungen", titel: "Einstellungen", admin: true },
  { pfad: "/moderator/module", titel: "Module", admin: true },
  { pfad: "/moderator/berechtigungen", titel: "Berechtigungen", admin: true },
  { pfad: "/moderator/update", titel: "Update", admin: true },
];

export function ModeratorLayout() {
  const { moderatorAbmelden, moderatorRolle } = useAuth();
  const navigate = useNavigate();
  const istAdmin = moderatorRolle === "admin";
  const sichtbareNavItems = NAV_ITEMS.filter((item) => !item.admin || istAdmin);
  const [menuOffen, setMenuOffen] = useState(false);
  const [aktiveModule, setAktiveModule] = useState<FeatureModul[]>([]);

  // Aktive Feature-Module als Unterpunkte unter „Module" (nur für Admins, die den
  // Modul-Bereich sehen). Reihenfolge kommt aus der Modul-Verwaltung.
  useEffect(() => {
    if (!istAdmin) return;
    holeFeatureModule()
      .then((m) => setAktiveModule(m.filter((x) => x.aktiv)))
      .catch(() => setAktiveModule([]));
  }, [istAdmin]);

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
            <Fragment key={item.pfad}>
              <NavLink
                to={item.pfad}
                end={item.pfad === "/moderator/module"}
                className={({ isActive }) => `moderator-nav-link${isActive ? " aktiv" : ""}`}
                onClick={() => setMenuOffen(false)}
              >
                {item.titel}
              </NavLink>
              {item.pfad === "/moderator/module" &&
                aktiveModule.map((m) => (
                  <NavLink
                    key={m.key}
                    to={`/moderator/module/${m.key}`}
                    className={({ isActive }) =>
                      `moderator-nav-link moderator-nav-unterpunkt${isActive ? " aktiv" : ""}`
                    }
                    onClick={() => setMenuOffen(false)}
                  >
                    {m.name}
                  </NavLink>
                ))}
            </Fragment>
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
