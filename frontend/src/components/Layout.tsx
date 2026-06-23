import { Outlet, Link } from "react-router-dom";
import { useConfig } from "../context/ConfigContext";

export function Layout() {
  const { config } = useConfig();

  return (
    <>
      <header className="kopfzeile">
        {config?.logo_url && <img src={config.logo_url} alt="Logo" />}
        <span className="organisation">{config?.organisation_name ?? "Gerätehaus.app"}</span>
      </header>
      <main className="seite">
        <Outlet />
      </main>
      <footer className="fusszeile">
        Erstellt mit <a href="https://github.com" target="_blank" rel="noreferrer">Gerätehaus.app</a> ·{" "}
        <Link to="/datenschutz">Datenschutz</Link> · <Link to="/moderator">Moderator-Bereich</Link>
      </footer>
    </>
  );
}
