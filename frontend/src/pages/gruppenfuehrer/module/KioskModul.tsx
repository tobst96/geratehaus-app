import { Link } from "react-router-dom";
import { KioskGeraete } from "../KioskGeraete";

export function KioskModul() {
  return (
    <div>
      <p>
        <Link to="/gruppenfuehrer/module">← Zurück zu den Modulen</Link>
      </p>
      <KioskGeraete />
    </div>
  );
}
