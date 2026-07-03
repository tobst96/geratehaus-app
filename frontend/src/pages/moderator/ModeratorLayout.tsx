import { Fragment, useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useConfig } from "../../context/ConfigContext";
import { holeFeatureModule, type FeatureModul } from "../../api/featureModule";
import { navIcon } from "./navIcons";

type ModulKey =
  | "modul_einsatztagebuch_aktiv"
  | "modul_dienstbuch_aktiv"
  | "modul_dienststunden_aktiv"
  | "modul_fahrzeugbuchung_aktiv";

type NavItem = { pfad: string; titel: string; icon: string; modulKey?: ModulKey };
type NavGruppe = {
  id: string;
  titel: string | null;
  admin: boolean;
  items: NavItem[];
  module?: boolean;
  listen?: boolean;
};

const NAV_GRUPPEN: NavGruppe[] = [
  { id: "start", titel: null, admin: false, items: [{ pfad: "/moderator/dashboard", titel: "Dashboard", icon: "dashboard" }] },
  { id: "listen", titel: "Listen", admin: false, listen: true, items: [] },
  {
    id: "buchungen",
    titel: null,
    admin: false,
    items: [{ pfad: "/moderator/buchungen", titel: "Buchungen", icon: "fahrzeug", modulKey: "modul_fahrzeugbuchung_aktiv" }],
  },
  {
    id: "verwaltung",
    titel: "Verwaltung",
    admin: true,
    items: [
      { pfad: "/moderator/barcodes", titel: "Barcodes", icon: "barcodes" },
      { pfad: "/moderator/kiosk-geraete", titel: "Kiosk-Geräte", icon: "kiosk" },
      { pfad: "/moderator/benachrichtigungen", titel: "Benachrichtigungen", icon: "benachrichtigungen" },
      { pfad: "/moderator/einstellungen", titel: "Einstellungen", icon: "einstellungen" },
      { pfad: "/moderator/berechtigungen", titel: "Berechtigungen", icon: "berechtigungen" },
      { pfad: "/moderator/update", titel: "Update", icon: "update" },
    ],
  },
  {
    id: "module",
    titel: "Module",
    admin: true,
    module: true,
    items: [{ pfad: "/moderator/module", titel: "Übersicht", icon: "module" }],
  },
];

const LISTEN_UNTERPUNKTE: { tab: string; icon: string; modulKey: ModulKey }[] = [
  { tab: "Einsätze", icon: "einsatz", modulKey: "modul_einsatztagebuch_aktiv" },
  { tab: "Dienstbücher", icon: "dienstbuch", modulKey: "modul_dienstbuch_aktiv" },
  { tab: "Dienststunden", icon: "dienststunden", modulKey: "modul_dienststunden_aktiv" },
  { tab: "Buchungen", icon: "fahrzeug", modulKey: "modul_fahrzeugbuchung_aktiv" },
];

const MODUL_ICON: Record<string, string> = {
  einsatztagebuch: "einsatz",
  dienstbuch: "dienstbuch",
  dienststunden: "dienststunden",
  fahrzeugbuchung: "fahrzeug",
  divera: "divera",
  personal: "personal",
  fahrzeuge: "fahrzeug",
};

export function ModeratorLayout() {
  const { moderatorAbmelden, moderatorRolle } = useAuth();
  const { config } = useConfig();
  const navigate = useNavigate();
  const location = useLocation();
  const istAdmin = moderatorRolle === "admin";
  const sichtbareGruppen = NAV_GRUPPEN.filter((g) => !g.admin || istAdmin);
  const [drawerOffen, setDrawerOffen] = useState(false);
  const [moduleOffen, setModuleOffen] = useState(false);
  const [aktiveModule, setAktiveModule] = useState<FeatureModul[]>([]);

  useEffect(() => {
    if (!istAdmin) return;
    holeFeatureModule()
      .then((m) => setAktiveModule(m.filter((x) => x.aktiv)))
      .catch(() => setAktiveModule([]));
  }, [istAdmin]);

  // Beim Navigieren (Pfadwechsel) den mobilen Drawer schließen.
  useEffect(() => {
    setDrawerOffen(false);
  }, [location.pathname, location.search]);

  function abmelden() {
    moderatorAbmelden();
    navigate("/");
  }

  const modulAktiv = (key: ModulKey) => config?.[key] !== false;
  const listenTab =
    location.pathname === "/moderator/listen"
      ? new URLSearchParams(location.search).get("tab") || "Einsätze"
      : null;

  const linkClass =
    (istUnter = false) =>
    ({ isActive }: { isActive: boolean }) =>
      `mod-nav-link${istUnter ? " mod-nav-link--sub" : ""}${isActive ? " aktiv" : ""}`;

  return (
    <div className="mod-shell">
      <button
        type="button"
        className="mod-mobile-toggle"
        onClick={() => setDrawerOffen((o) => !o)}
        aria-label="Menü öffnen"
        aria-expanded={drawerOffen}
      >
        <span className="mod-burger" />
        Menü
      </button>

      {drawerOffen && <div className="mod-overlay" onClick={() => setDrawerOffen(false)} />}

      <aside className={`mod-sidebar${drawerOffen ? " offen" : ""}`}>
        <div className="mod-sidebar-kopf">
          <span>{config?.organisation_name ?? "Moderator"}</span>
          <button type="button" className="mod-sidebar-close" onClick={() => setDrawerOffen(false)} aria-label="Schließen">
            ✕
          </button>
        </div>

        <nav className="mod-nav">
          {sichtbareGruppen.map((gruppe) => (
            <Fragment key={gruppe.id}>
              {gruppe.titel &&
                (gruppe.module ? (
                  <button
                    type="button"
                    className="mod-nav-section mod-nav-section--toggle"
                    onClick={() => setModuleOffen((o) => !o)}
                    aria-expanded={moduleOffen}
                  >
                    {gruppe.titel}
                    <span className={`mod-chevron${moduleOffen ? " auf" : ""}`} aria-hidden="true" />
                  </button>
                ) : (
                  <div className="mod-nav-section">{gruppe.titel}</div>
                ))}

              {gruppe.items
                .filter((item) => !item.modulKey || modulAktiv(item.modulKey))
                .map((item) => (
                  <NavLink
                    key={item.pfad}
                    to={item.pfad}
                    end={item.pfad === "/moderator/module"}
                    className={linkClass(false)}
                  >
                    {navIcon(item.icon)}
                    <span>{item.titel}</span>
                  </NavLink>
                ))}

              {gruppe.listen && (
                <>
                  {LISTEN_UNTERPUNKTE.filter((u) => modulAktiv(u.modulKey)).map((u) => (
                    <NavLink
                      key={u.tab}
                      to={`/moderator/listen?tab=${encodeURIComponent(u.tab)}`}
                      className={`mod-nav-link mod-nav-link--sub${listenTab === u.tab ? " aktiv" : ""}`}
                    >
                      {navIcon(u.icon)}
                      <span>{u.tab}</span>
                    </NavLink>
                  ))}
                  {istAdmin && (
                    <NavLink
                      to="/moderator/listen?tab=Namensabweichungen"
                      className={`mod-nav-link mod-nav-link--sub${listenTab === "Namensabweichungen" ? " aktiv" : ""}`}
                    >
                      {navIcon("warnung")}
                      <span>Namensabweichungen</span>
                    </NavLink>
                  )}
                </>
              )}

              {gruppe.module &&
                moduleOffen &&
                aktiveModule.map((m) => (
                  <NavLink key={m.key} to={`/moderator/module/${m.key}`} className={linkClass(true)}>
                    {navIcon(MODUL_ICON[m.key])}
                    <span>{m.name}</span>
                  </NavLink>
                ))}
            </Fragment>
          ))}
        </nav>

        <button type="button" className="mod-logout" onClick={abmelden}>
          Abmelden
        </button>
      </aside>

      <main className="mod-content">
        <Outlet />
      </main>
    </div>
  );
}
