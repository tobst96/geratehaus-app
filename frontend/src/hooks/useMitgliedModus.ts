import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/** Erkennt, ob eine Modul-Seite (Einsatztagebuch/Dienstbuch/Dienststunden/
 * Fahrzeugbuchung) über den Mitglieder-Hub aufgerufen wurde (state.mitgliedModus,
 * gesetzt von MitgliedHub.tsx) statt über den Kiosk. Auf dem Kiosk teilen sich
 * mehrere Personen ein Gerät – dort muss bei jeder Aktion erneut der Barcode
 * gescannt werden, um die handelnde Person festzulegen. Im Mitglieder-Bereich
 * ist die Identität über den eigenen Barcode-Login bereits eindeutig (eigenes
 * Handy, geraetehaus_name-Cookie), ein erneuter Scan ist daher überflüssig. */
export function useMitgliedModus(): { aktiv: boolean; name: string | null } {
  const location = useLocation();
  const { angezeigterName } = useAuth();
  const aktiv = Boolean((location.state as { mitgliedModus?: boolean } | null)?.mitgliedModus) && Boolean(angezeigterName);
  return { aktiv, name: aktiv ? angezeigterName : null };
}
