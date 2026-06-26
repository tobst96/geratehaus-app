import { Outlet, Link } from "react-router-dom";
import { useConfig } from "../context/ConfigContext";
import { useAuth } from "../context/AuthContext";

function startseite(moderatorAngemeldet: boolean, angezeigterName: string | null): string {
  if (moderatorAngemeldet) return "/moderator/dashboard";
  if (angezeigterName) return "/mitglied";
  return "/";
}

export function Layout() {
  const { config } = useConfig();
  const { moderatorAngemeldet, angezeigterName } = useAuth();

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
