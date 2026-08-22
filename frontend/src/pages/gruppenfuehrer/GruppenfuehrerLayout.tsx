import { Fragment, useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useConfig } from "../../context/ConfigContext";
import { holeFeatureModule, type FeatureModul } from "../../api/featureModule";
import { navIcon } from "./navIcons";
import { GRANTBARE_MODUL_UNTERSEITEN } from "./modulRechte";
import { texte } from "../../i18n/texte";

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
  { id: "start", titel: null, admin: false, items: [{ pfad: "/gruppenfuehrer/dashboard", titel: texte.gruppenfuehrer_nav.dashboard, icon: "dashboard" }] },
  {
    id: "buchungen",
    titel: null,
    admin: false,
    items: [{ pfad: "/gruppenfuehrer/buchungen", titel: texte.gruppenfuehrer_nav.buchungen, icon: "fahrzeug", modulKey: "modul_fahrzeugbuchung_aktiv", berechtigungKey: "fahrzeugbuchung" }],
  },
  { id: "listen", titel: texte.gruppenfuehrer_nav.gruppe_listen, admin: false, listen: true, items: [] },
  {
    id: "module",
    titel: texte.gruppenfuehrer_nav.gruppe_module,
    admin: true,
    module: true,
    items: [{ pfad: "/gruppenfuehrer/module", titel: texte.gruppenfuehrer_nav.uebersicht, icon: "module", berechtigungKey: "einstellungen" }],
  },
  {
    id: "verwaltung",
    titel: texte.gruppenfuehrer_nav.gruppe_verwaltung,
    admin: true,
    items: [
      { pfad: "/gruppenfuehrer/berechtigungen", titel: texte.gruppenfuehrer_nav.berechtigungen, icon: "berechtigungen", berechtigungKey: "berechtigungen" },
      { pfad: "/gruppenfuehrer/audit", titel: texte.gruppenfuehrer_nav.audit_log, icon: "berechtigungen", nurAdmin: true },
      { pfad: "/gruppenfuehrer/systemstatus", titel: texte.gruppenfuehrer_nav.systemstatus, icon: "update", nurAdmin: true },
      { pfad: "/gruppenfuehrer/update", titel: texte.gruppenfuehrer_nav.update, icon: "update", berechtigungKey: "einstellungen" },
      { pfad: "/gruppenfuehrer/einstellungen", titel: texte.gruppenfuehrer_nav.einstellungen, icon: "einstellungen", berechtigungKey: "einstellungen" },
    ],
  },
];

// `perm` = Berechtigungs-Key: der Listen-Tab erscheint für Gruppenführer nur mit
// diesem Modul-Recht (Admins via Bypass). Formulare hat kein perm – die Sichtbarkeit
// der Einreichungen steuert der Server über `gruppenfuehrer_sichtbar`.
const LISTEN_UNTERPUNKTE: { tab: string; icon: string; modulKey: ModulKey; perm?: string }[] = [
  { tab: "Einsätze", icon: "einsatz", modulKey: "modul_einsatztagebuch_aktiv", perm: "einsatztagebuch" },
  { tab: "Dienstbücher", icon: "dienstbuch", modulKey: "modul_dienstbuch_aktiv", perm: "dienstbuch" },
  { tab: "Dienststunden", icon: "dienststunden", modulKey: "modul_dienststunden_aktiv", perm: "dienststunden" },
  { tab: "Buchungen", icon: "fahrzeug", modulKey: "modul_fahrzeugbuchung_aktiv", perm: "fahrzeugbuchung" },
  { tab: "Formulare", icon: "formular", modulKey: "modul_formular_aktiv" },
];

const MODUL_ICON: Record<string, string> = {
  einsatztagebuch: "einsatz",
  dienstbuch: "dienstbuch",
  dienststunden: "dienststunden",
  fahrzeugbuchung: "fahrzeug",
  formular: "formular",
  divera: "divera",
  pressebericht: "pressebericht",
  elw: "fahrzeug",
  personal: "personal",
  fahrzeuge: "fahrzeug",
  barcode: "barcodes",
  benachrichtigungen: "benachrichtigungen",
  kiosk: "kiosk",
  backup: "backup",
  minio: "backup",
};

export function GruppenfuehrerLayout() {
  const t = texte.gruppenfuehrer_nav;
  const { gruppenfuehrerAbmelden, gruppenfuehrerRolle, hatModulZugriff, angezeigterName } = useAuth();
  const { config, neuLaden } = useConfig();
  const navigate = useNavigate();
  const location = useLocation();
  const istAdmin = gruppenfuehrerRolle === "admin";

  // Ein Nav-Punkt ist sichtbar, wenn er keinen Berechtigungs-Key hat (dann greift
  // die Gruppen-Rollenregel) oder der Gruppenführer den Modul-Zugriff besitzt.
  const itemSichtbar = (item: NavItem) =>
    (!item.nurAdmin || istAdmin) && (!item.berechtigungKey || hatModulZugriff(item.berechtigungKey));
  // Admin-Gruppen: für Admins immer sichtbar; sonst nur, wenn mindestens ein Punkt
  // über einen Berechtigungs-Key freigeschaltet ist (rein rollen-basierte
  // Admin-Gruppen ohne Keys bleiben für Nicht-Admins verborgen).
  // Grantbare Modul-Unterseiten, die dieser Gruppenführer freigeschaltet hat (für
  // Gruppenführer, damit die "Module"-Gruppe + ihre Unterseiten erscheinen).
  const grantbareUnterseiten = GRANTBARE_MODUL_UNTERSEITEN.filter((m) => hatModulZugriff(m.perm));
  const gruppeSichtbar = (g: NavGruppe) =>
    !g.admin ||
    istAdmin ||
    g.items.some((i) => i.berechtigungKey && hatModulZugriff(i.berechtigungKey)) ||
    (!!g.module && grantbareUnterseiten.length > 0);
  const sichtbareGruppen = NAV_GRUPPEN.filter(gruppeSichtbar);
  const [drawerOffen, setDrawerOffen] = useState(false);
  const [moduleOffen, setModuleOffen] = useState(true);
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
    gruppenfuehrerAbmelden();
    navigate("/");
  }

  const modulAktiv = (key: ModulKey) => config?.[key] !== false;
  const listenTab =
    location.pathname === "/gruppenfuehrer/listen"
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
        aria-label={t.menue_oeffnen}
        aria-expanded={drawerOffen}
      >
        <span className="mod-burger" />
        {t.menue}
      </button>

      {drawerOffen && <div className="mod-overlay" onClick={() => setDrawerOffen(false)} />}

      <aside className={`mod-sidebar${drawerOffen ? " offen" : ""}`}>
        <div className="mod-sidebar-kopf">
          <span>{config?.organisation_name ?? t.organisation_fallback}</span>
          <button type="button" className="mod-sidebar-close" onClick={() => setDrawerOffen(false)} aria-label={t.schliessen}>
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

              {/* In der aufklappbaren „Module"-Gruppe gehört auch die „Übersicht"
                  unter den Toggle (erst beim Aufklappen sichtbar), damit der Pfeil
                  die ganze Sektion inkl. Übersicht steuert und nichts dazwischen
                  „hängt". Nicht-aufklappbare Gruppen zeigen ihre Punkte wie bisher. */}
              {(!gruppe.module || moduleOffen) &&
                gruppe.items
                  .filter((item) => (!item.modulKey || modulAktiv(item.modulKey)) && itemSichtbar(item))
                  .map((item) => (
                    <NavLink
                      key={item.pfad}
                      to={item.pfad}
                      end={item.pfad === "/gruppenfuehrer/module"}
                      className={linkClass(false)}
                    >
                      {navIcon(item.icon)}
                      <span>{item.titel}</span>
                    </NavLink>
                  ))}

              {gruppe.listen && listenOffen && (
                <>
                  {LISTEN_UNTERPUNKTE.filter(
                    (u) => modulAktiv(u.modulKey) && (!u.perm || hatModulZugriff(u.perm))
                  ).map((u) => (
                    <NavLink
                      key={u.tab}
                      to={`/gruppenfuehrer/listen?tab=${encodeURIComponent(u.tab)}`}
                      className={`mod-nav-link mod-nav-link--sub${listenTab === u.tab ? " aktiv" : ""}`}
                    >
                      {navIcon(u.icon)}
                      <span>{u.tab}</span>
                    </NavLink>
                  ))}
                </>
              )}

              {gruppe.module &&
                moduleOffen &&
                (istAdmin
                  ? aktiveModule.map((m) => (
                      <NavLink key={m.key} to={`/gruppenfuehrer/module/${m.key}`} className={linkClass(true)}>
                        {navIcon(MODUL_ICON[m.key])}
                        <span>{m.name}</span>
                      </NavLink>
                    ))
                  : grantbareUnterseiten.map((m) => (
                      <NavLink key={m.key} to={`/gruppenfuehrer/module/${m.key}`} className={linkClass(true)}>
                        {navIcon(m.icon)}
                        <span>{m.titel}</span>
                      </NavLink>
                    )))}
            </Fragment>
          ))}
        </nav>

        {angezeigterName && (
          <button type="button" className="mod-logout" onClick={() => navigate("/mitglied")}>
            {t.zurueck_zur_mitgliederseite}
          </button>
        )}
        <button type="button" className="mod-logout" onClick={abmelden}>
          {t.abmelden}
        </button>
      </aside>

      <main className="mod-content">
        <Outlet />
      </main>
    </div>
  );
}
