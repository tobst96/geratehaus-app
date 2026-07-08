import { Link } from "react-router-dom";
import { BarcodeGenerator } from "../BarcodeGenerator";

export function BarcodeModul() {
  return (
    <div>
      <p>
        <Link to="/moderator/module">← Zurück zu den Modulen</Link>
      </p>
      <h1>Barcode</h1>
      <p className="text-mute">
        Ist dieses Modul aktiv, identifizieren sich Personen am Kiosk per Barcode-Scan. Ist es
        deaktiviert, erfolgt die Anmeldung stattdessen über Namensauswahl und persönlichen PIN.
      </p>

      <BarcodeGenerator />
    </div>
  );
}
