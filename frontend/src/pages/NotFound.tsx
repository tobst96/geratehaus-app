import { Link } from "react-router-dom";
import { texte } from "../i18n/texte";

export function NotFound() {
  return (
    <div>
      <h1>{texte.not_found.titel}</h1>
      <p>
        <Link to="/">{texte.not_found.zur_startseite}</Link>
      </p>
    </div>
  );
}
