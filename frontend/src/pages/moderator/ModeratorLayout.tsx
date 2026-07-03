import { Fragment, useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { holeFeatureModule, type FeatureModul } from "../../api/featureModule";

type NavItem = { pfad: string; titel: string };
type NavGruppe = { titel: string | null; admin: boolean; items: NavItem[]; module?: boolean };

// Navigation in logische Gruppen. `titel` ist nur im mobilen Menü als
// Abschnittsüberschrift sichtbar (auf dem Desktop ausgeblendet). Die Gruppe
// „Module" bekommt die aktiven Feature-Module als eingerückte Unterpunkte.
const NAV_GRUPPEN: NavGruppe[] = [
  {
    titel: null,
    admin: false,
    items: [
      { pfad: "/moderator/dashboard", titel: "Dashboard" },
      { pfad: "/moderator/listen", titel: "Listen" },
      { pfad: "/moderator/buchungen", titel: "Buchungen" },
    ],
  },
  {
    titel: "Verwaltung",
    admin: true,
    items: [
      { pfad: "/moderator/personal", titel: "Personal" },
      { pfad: "/moderator/stammdaten", titel: "Stammdaten" },
      { pfad: "/moderator/barcodes", titel: "Barcodes" },
      { pfad: "/moderator/kiosk-geraete", titel: "Kiosk-Geräte" },
      { pfad: "/moderator/benachrichtigungen", titel: "Benachrichtigungen" },
      { pfad: "/moderator/einstellungen", titel: "Einstellungen" },
      { pfad: "/moderator/berechtigungen", titel: "Berechtigungen" },
      { pfad: "/moderator/update", titel: "Update" },
    ],
  },
  {
    titel: "Module",
    admin: true,
    module: true,
    items: [{ pfad: "/moderator/module", titel: "Übersicht" }],
  },
];

export function ModeratorLayout() {
  const { moderatorAbmelden, moderatorRolle } = useAuth();
  const navigate = useNavigate();
  const istAdmin = moderatorRolle === "admin";
  const sichtbareGruppen = NAV_GRUPPEN.filter((g) => !g.admin || istAdmin);
  const [menuOffen, setMenuOffen] = useState(false);
  const [aktiveModule, setAktiveModule] = useState<FeatureModul[]>([]);

  // Aktive Feature-Module als Unterpunkte unter „Module" (nur für Admins).
  // Reihenfolge kommt aus der Modul-Verwaltung.
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
          {sichtbareGruppen.map((gruppe) => (
            <Fragment key={gruppe.titel ?? "start"}>
              {gruppe.titel && <div className="moderator-nav-gruppe-titel">{gruppe.titel}</div>}
              {gruppe.items.map((item) => (
                <NavLink
                  key={item.pfad}
                  to={item.pfad}
                  end={item.pfad === "/moderator/module"}
                  className={({ isActive }) => `moderator-nav-link${isActive ? " aktiv" : ""}`}
                  onClick={() => setMenuOffen(false)}
                >
                  {item.titel}
                </NavLink>
              ))}
              {gruppe.module &&
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
