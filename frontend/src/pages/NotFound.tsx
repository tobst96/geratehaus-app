import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <div>
      <h1>Seite nicht gefunden</h1>
      <p>
        <Link to="/">Zurück zur Startseite</Link>
      </p>
    </div>
  );
}
