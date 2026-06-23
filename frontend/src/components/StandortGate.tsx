import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useStandort } from "../context/StandortContext";
import { NameForm } from "./NameForm";

/** Schützt die Kameraden-Module: verlangt zunächst einen Namen, danach eine
 * erfolgreiche Standortermittlung. Der eigentliche Geofence-Abgleich (ist
 * der Standort nahe genug am Gerätehaus?) passiert serverseitig bei jedem
 * Request – die Koordinaten selbst werden dem Client nie verraten. */
export function StandortGate() {
  const { angezeigterName } = useAuth();
  const { position, status, fehlertext, anfordern } = useStandort();

  useEffect(() => {
    if (angezeigterName && status === "unbekannt") {
      anfordern();
    }
  }, [angezeigterName, status, anfordern]);

  if (!angezeigterName) {
    return <NameForm onFertig={() => {}} />;
  }

  if (status === "wird_angefragt" || status === "unbekannt") {
    return (
      <div className="karte">
        <p>Standort wird ermittelt …</p>
      </div>
    );
  }

  if (status === "abgelehnt" || status === "nicht_unterstuetzt") {
    return (
      <div className="karte">
        <p className="fehlertext">{fehlertext}</p>
        <button type="button" onClick={anfordern}>
          Erneut versuchen
        </button>
      </div>
    );
  }

  if (!position) {
    return null;
  }

  return <Outlet />;
}
