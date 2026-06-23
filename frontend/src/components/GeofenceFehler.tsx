import { useStandort } from "../context/StandortContext";

interface GeofenceFehlerProps {
  nachricht: string;
}

/** Einheitliche Fehleranzeige, wenn der Server eine Standort-geschützte
 * Aktion ablehnt (außerhalb des Gerätehaus-Bereichs oder Standort veraltet). */
export function GeofenceFehler({ nachricht }: GeofenceFehlerProps) {
  const { anfordern } = useStandort();

  return (
    <div className="karte">
      <p className="fehlertext">{nachricht}</p>
      <button type="button" onClick={anfordern}>
        Standort neu ermitteln
      </button>
    </div>
  );
}
