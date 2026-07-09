import { Link } from "react-router-dom";
import { NotifierEinstellungen } from "../NotifierEinstellungen";

export function BenachrichtigungenModul() {
  return (
    <div>
      <p>
        <Link to="/gruppenfuehrer/module">← Zurück zu den Modulen</Link>
      </p>
      <NotifierEinstellungen />
    </div>
  );
}
