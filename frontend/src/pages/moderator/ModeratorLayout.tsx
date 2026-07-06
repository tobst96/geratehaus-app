import { Fragment, useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useConfig } from "../../context/ConfigContext";
import { holeFeatureModule, type FeatureModul } from "../../api/featureModule";
import { navIcon } from "./navIcons";
import { GRANTBARE_MODUL_UNTERSEITEN } from "./modulRechte";

type ModulKey =
  | "modul_einsatztagebuch_aktiv"
  | "modul_dienstbuch_aktiv"
  | "modul_dienststunden_aktiv"
  | "modul_fahrzeugbuchung_aktiv"
  | "modul_formular_aktiv";

type NavItem = {
  pfad: string;
  titel: string;
  icon: string;
  modulKey?: ModulKey;
  // Individueller Modul-Zugriff (Berechtigungssystem). Ist er gesetzt, wird der
  // Punkt statt über die Rolle über `hat_zugriff` eingeblendet (Admins via Bypass).
  berechtigungKey?: string;
  // Nur für Admins sichtbar (Backend-Endpunkt ist CurrentAdmin, kein granulares
  // Modul-Recht) – auch wenn die Gruppe für einen Gruppenführer sichtbar wird.
  nurAdmin?: boolean;
};
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
  {
    id: "buchungen",
    titel: null,
    admin: false,
    items: [{ pfad: "/moderator/buchungen", titel: "Buchungen", icon: "fahrzeug", modulKey: "modul_fahrzeugbuchung_aktiv" }],
  },
  { id: "listen", titel: "Listen", admin: false, listen: true, items: [] },
  {
    id: "module",
    titel: "Module",
    admin: true,
    module: true,
    items: [{ pfad: "/moderator/module", titel: "Übersicht", icon: "module", berechtigungKey: "einstellungen" }],
  },
  {
    id: "verwaltung",
    titel: "Verwaltung",
    admin: true,
    items: [
      { pfad: "/moderator/berechtigungen", titel: "Berechtigungen", icon: "berechtigungen", berechtigungKey: "berechtigungen" },
      { pfad: "/moderator/audit", titel: "Audit-Log", icon: "berechtigungen", nurAdmin: true },
      { pfad: "/moderator/update", titel: "Update", icon: "update", berechtigungKey: "einstellungen" },
      { pfad: "/moderator/einstellungen", titel: "Einstellungen", icon: "einstellungen", berechtigungKey: "einstellungen" },
    ],
  },
];

const LISTEN_UNTERPUNKTE: { tab: string; icon: string; modulKey: ModulKey }[] = [
  { tab: "Einsätze", icon: "einsatz", modulKey: "modul_einsatztagebuch_aktiv" },
  { tab: "Dienstbücher", icon: "dienstbuch", modulKey: "modul_dienstbuch_aktiv" },
  { tab: "Dienststunden", icon: "dienststunden", modulKey: "modul_dienststunden_aktiv" },
  { tab: "Buchungen", icon: "fahrzeug", modulKey: "modul_fahrzeugbuchung_aktiv" },
  { tab: "Formulare", icon: "formular", modulKey: "modul_formular_aktiv" },
];

const MODUL_ICON: Record<string, string> = {
  einsatztagebuch: "einsatz",
  dienstbuch: "dienstbuch",
  dienststunden: "dienststunden",
  fahrzeugbuchung: "fahrzeug",
  formular: "formular",
  divera: "divera",
  personal: "personal",
  fahrzeuge: "fahrzeug",
  barcode: "barcodes",
  benachrichtigungen: "benachrichtigungen",
  kiosk: "kiosk",
  backup: "backup",
  minio: "backup",
};

export function ModeratorLayout() {
  const { moderatorAbmelden, moderatorRolle, hatModulZugriff } = useAuth();
  const { config, neuLaden } = useConfig();
  const navigate = useNavigate();
  const location = useLocation();
  const istAdmin = moderatorRolle === "admin";

  // Ein Nav-Punkt ist sichtbar, wenn er keinen Berechtigungs-Key hat (dann greift
  // die Gruppen-Rollenregel) oder der Moderator den Modul-Zugriff besitzt.
  const itemSichtbar = (item: NavItem) =>
    (!item.nurAdmin || istAdmin) && (!item.berechtigungKey || hatModulZugriff(item.berechtigungKey));
  // Admin-Gruppen: für Admins immer sichtbar; sonst nur, wenn mindestens ein Punkt
  // über einen Berechtigungs-Key freigeschaltet ist (rein rollen-basierte
  // Admin-Gruppen ohne Keys bleiben für Nicht-Admins verborgen).
  // Grantbare Modul-Unterseiten, die dieser Moderator freigeschaltet hat (für
  // Gruppenführer, damit die "Module"-Gruppe + ihre Unterseiten erscheinen).
  const grantbareUnterseiten = GRANTBARE_MODUL_UNTERSEITEN.filter((m) => hatModulZugriff(m.perm));
  const gruppeSichtbar = (g: NavGruppe) =>
    !g.admin ||
    istAdmin ||
    g.items.some((i) => i.berechtigungKey && hatModulZugriff(i.berechtigungKey)) ||
    (!!g.module && grantbareUnterseiten.length > 0);
  const sichtbareGruppen = NAV_GRUPPEN.filter(gruppeSichtbar);
  const [drawerOffen, setDrawerOffen] = useState(false);
  const [moduleOffen, setModuleOffen] = useState(false);
  const [listenOffen, setListenOffen] = useState(true);
  const [aktiveModule, setAktiveModule] = useState<FeatureModul[]>([]);

  // Aktive Module + Config bei jedem Seitenwechsel neu laden, damit ein gerade
  // deaktiviertes Modul (auf der Modul-Seite umgeschaltet) auch aus der Navigation
  // verschwindet.
  useEffect(() => {
    if (istAdmin) {
      holeFeatureModule()
        .then((m) => setAktiveModule(m.filter((x) => x.aktiv)))
        .catch(() => setAktiveModule([]));
    }
    neuLaden();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, istAdmin]);

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
                (gruppe.module || gruppe.listen ? (
                  <button
                    type="button"
                    className="mod-nav-section mod-nav-section--toggle"
                    onClick={() => (gruppe.module ? setModuleOffen((o) => !o) : setListenOffen((o) => !o))}
                    aria-expanded={gruppe.module ? moduleOffen : listenOffen}
                  >
                    {gruppe.titel}
                    <span
                      className={`mod-chevron${(gruppe.module ? moduleOffen : listenOffen) ? " auf" : ""}`}
                      aria-hidden="true"
                    />
                  </button>
                ) : (
                  <div className="mod-nav-section">{gruppe.titel}</div>
                ))}

              {gruppe.items
                .filter((item) => (!item.modulKey || modulAktiv(item.modulKey)) && itemSichtbar(item))
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

              {gruppe.listen && listenOffen && (
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
                (istAdmin
                  ? aktiveModule.map((m) => (
                      <NavLink key={m.key} to={`/moderator/module/${m.key}`} className={linkClass(true)}>
                        {navIcon(MODUL_ICON[m.key])}
                        <span>{m.name}</span>
                      </NavLink>
                    ))
                  : grantbareUnterseiten.map((m) => (
                      <NavLink key={m.key} to={`/moderator/module/${m.key}`} className={linkClass(true)}>
                        {navIcon(m.icon)}
                        <span>{m.titel}</span>
                      </NavLink>
                    )))}
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
