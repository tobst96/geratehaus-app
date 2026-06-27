import { Outlet, Link } from "react-router-dom";
import { useConfig } from "../context/ConfigContext";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../hooks/useTheme";

function startseite(moderatorAngemeldet: boolean, angezeigterName: string | null): string {
  if (moderatorAngemeldet) return "/moderator/dashboard";
  if (angezeigterName) return "/mitglied";
  return "/";
}

export function Layout() {
  const { config } = useConfig();
  const { moderatorAngemeldet, angezeigterName } = useAuth();
  const { theme, umschalten } = useTheme();

  return (
    <>
      <header className="kopfzeile">
        <Link
          to={startseite(moderatorAngemeldet, angezeigterName)}
          style={{ display: "flex", alignItems: "center", gap: "0.75rem", textDecoration: "none", color: "inherit" }}
        >
          {config?.logo_url && <img src={config.logo_url} alt="Logo" />}
          <span className="organisation">{config?.organisation_name ?? "Gerätehaus.app"}</span>
        </Link>
        <button
          type="button"
          className="theme-umschalter"
          onClick={umschalten}
          aria-label={theme === "dark" ? "Helles Design aktivieren" : "Dunkles Design aktivieren"}
          title={theme === "dark" ? "Helles Design aktivieren" : "Dunkles Design aktivieren"}
        >
          {theme === "dark" ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>
      </header>
      <main className="seite">
        <Outlet />
      </main>
      <footer className="fusszeile">
        Erstellt mit{" "}
        <a href="https://github.com/tobst96/geratehaus-app" target="_blank" rel="noreferrer">
          Gerätehaus.app
        </a>{" "}
        ·{" "}
        <Link to="/datenschutz">Datenschutz</Link> · <Link to="/moderator">Team-Login</Link>
      </footer>
    </>
  );
}
