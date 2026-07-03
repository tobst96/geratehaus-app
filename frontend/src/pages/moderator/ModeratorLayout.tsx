import { Fragment, useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useConfig } from "../../context/ConfigContext";
import { holeFeatureModule, type FeatureModul } from "../../api/featureModule";

type ModulKey =
  | "modul_einsatztagebuch_aktiv"
  | "modul_dienstbuch_aktiv"
  | "modul_dienststunden_aktiv"
  | "modul_fahrzeugbuchung_aktiv";

type NavItem = { pfad: string; titel: string; modulKey?: ModulKey };
type NavGruppe = {
  id: string;
  titel: string | null;
  admin: boolean;
  items: NavItem[];
  module?: boolean;
  listen?: boolean;
};

// Navigation in logische Gruppen. `titel` ist nur im mobilen Menü als
// Abschnittsüberschrift sichtbar (auf dem Desktop ausgeblendet). „Module" und
// „Listen" haben eingerückte Unterpunkte; Unterpunkte/Einträge, deren Modul
// deaktiviert ist, werden ausgeblendet.
const NAV_GRUPPEN: NavGruppe[] = [
  { id: "start", titel: null, admin: false, items: [{ pfad: "/moderator/dashboard", titel: "Dashboard" }] },
  { id: "listen", titel: "Listen", admin: false, listen: true, items: [] },
  {
    id: "buchungen",
    titel: null,
    admin: false,
    items: [{ pfad: "/moderator/buchungen", titel: "Buchungen", modulKey: "modul_fahrzeugbuchung_aktiv" }],
  },
  {
    id: "verwaltung",
    titel: "Verwaltung",
    admin: true,
    items: [
      { pfad: "/moderator/barcodes", titel: "Barcodes" },
      { pfad: "/moderator/kiosk-geraete", titel: "Kiosk-Geräte" },
      { pfad: "/moderator/benachrichtigungen", titel: "Benachrichtigungen" },
      { pfad: "/moderator/einstellungen", titel: "Einstellungen" },
      { pfad: "/moderator/berechtigungen", titel: "Berechtigungen" },
      { pfad: "/moderator/update", titel: "Update" },
    ],
  },
  {
    id: "module",
    titel: "Module",
    admin: true,
    module: true,
    items: [{ pfad: "/moderator/module", titel: "Übersicht" }],
  },
];

// Listen-Unterpunkte je Modul (Tab in der Listen-Seite via ?tab=).
const LISTEN_UNTERPUNKTE: { tab: string; modulKey: ModulKey }[] = [
  { tab: "Einsätze", modulKey: "modul_einsatztagebuch_aktiv" },
  { tab: "Dienstbücher", modulKey: "modul_dienstbuch_aktiv" },
  { tab: "Dienststunden", modulKey: "modul_dienststunden_aktiv" },
  { tab: "Buchungen", modulKey: "modul_fahrzeugbuchung_aktiv" },
];

export function ModeratorLayout() {
  const { moderatorAbmelden, moderatorRolle } = useAuth();
  const { config } = useConfig();
  const navigate = useNavigate();
  const location = useLocation();
  const istAdmin = moderatorRolle === "admin";
  const sichtbareGruppen = NAV_GRUPPEN.filter((g) => !g.admin || istAdmin);
  const [menuOffen, setMenuOffen] = useState(false);
  const [moduleOffen, setModuleOffen] = useState(false);
  const [aktiveModule, setAktiveModule] = useState<FeatureModul[]>([]);

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

  const modulAktiv = (key: ModulKey) => config?.[key] !== false;
  // Aktiver Listen-Tab (für die Hervorhebung der Unterpunkte).
  const listenTab =
    location.pathname === "/moderator/listen"
      ? new URLSearchParams(location.search).get("tab") || "Einsätze"
      : null;

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
        <div
          className={`moderator-nav-links${menuOffen ? " offen" : ""}${moduleOffen ? "" : " module-zu"}`}
        >
          {sichtbareGruppen.map((gruppe) => (
            <Fragment key={gruppe.id}>
              {gruppe.titel &&
                (gruppe.module ? (
                  <button
                    type="button"
                    className="moderator-nav-gruppe-titel moderator-nav-gruppe-toggle"
                    onClick={() => setModuleOffen((o) => !o)}
                    aria-expanded={moduleOffen}
                  >
                    {gruppe.titel}
                    <span aria-hidden="true">{moduleOffen ? "▾" : "▸"}</span>
                  </button>
                ) : (
                  <div className="moderator-nav-gruppe-titel">{gruppe.titel}</div>
                ))}

              {gruppe.items
                .filter((item) => !item.modulKey || modulAktiv(item.modulKey))
                .map((item) => (
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

              {/* Listen-Unterpunkte (modul-gegated) */}
              {gruppe.listen && (
                <>
                  {LISTEN_UNTERPUNKTE.filter((u) => modulAktiv(u.modulKey)).map((u) => (
                    <NavLink
                      key={u.tab}
                      to={`/moderator/listen?tab=${encodeURIComponent(u.tab)}`}
                      className={`moderator-nav-link moderator-nav-unterpunkt${listenTab === u.tab ? " aktiv" : ""}`}
                      onClick={() => setMenuOffen(false)}
                    >
                      {u.tab}
                    </NavLink>
                  ))}
                  {istAdmin && (
                    <NavLink
                      to="/moderator/listen?tab=Namensabweichungen"
                      className={`moderator-nav-link moderator-nav-unterpunkt${listenTab === "Namensabweichungen" ? " aktiv" : ""}`}
                      onClick={() => setMenuOffen(false)}
                    >
                      Namensabweichungen
                    </NavLink>
                  )}
                </>
              )}

              {/* Modul-Unterpunkte */}
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

          <button type="button" className="sekundaer moderator-abmelden-mobil" onClick={abmelden}>
            Abmelden
          </button>
        </div>
        <button className="sekundaer moderator-abmelden" onClick={abmelden}>
          Abmelden
        </button>
      </nav>
      <Outlet />
    </div>
  );
}
