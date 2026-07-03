import { Link } from "react-router-dom";
import { NotifierEinstellungen } from "../NotifierEinstellungen";

export function BenachrichtigungenModul() {
  return (
    <div>
      <p>
        <Link to="/moderator/module">← Zurück zu den Modulen</Link>
      </p>
      <NotifierEinstellungen />
    </div>
  );
}
