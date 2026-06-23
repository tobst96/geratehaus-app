import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

export interface Position {
  lat: number;
  lon: number;
}

type StandortStatus = "unbekannt" | "wird_angefragt" | "verfuegbar" | "abgelehnt" | "nicht_unterstuetzt";

interface StandortContextValue {
  position: Position | null;
  status: StandortStatus;
  fehlertext: string | null;
  anfordern: () => void;
}

const StandortContext = createContext<StandortContextValue | null>(null);

export function StandortProvider({ children }: { children: ReactNode }) {
  const [position, setPosition] = useState<Position | null>(null);
  const [status, setStatus] = useState<StandortStatus>("unbekannt");
  const [fehlertext, setFehlertext] = useState<string | null>(null);

  const anfordern = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setStatus("nicht_unterstuetzt");
      setFehlertext("Dieser Browser unterstützt keine Standortermittlung.");
      return;
    }
    setStatus("wird_angefragt");
    setFehlertext(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setStatus("verfuegbar");
      },
      (error) => {
        setStatus("abgelehnt");
        setFehlertext(
          error.code === error.PERMISSION_DENIED
            ? "Standortzugriff wurde abgelehnt. Bitte erlaube den Zugriff in den Browser-Einstellungen."
            : "Standort konnte nicht ermittelt werden. Bitte versuche es erneut."
        );
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }, []);

  return (
    <StandortContext.Provider value={{ position, status, fehlertext, anfordern }}>
      {children}
    </StandortContext.Provider>
  );
}

export function useStandort(): StandortContextValue {
  const context = useContext(StandortContext);
  if (!context) {
    throw new Error("useStandort muss innerhalb von StandortProvider verwendet werden.");
  }
  return context;
}
