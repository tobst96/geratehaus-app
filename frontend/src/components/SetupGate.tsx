import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { holeSetupStatus, wurdeKuerzlichEingerichtet } from "../api/setup";

interface SetupGateProps {
  children: ReactNode;
}

/** Leitet auf den Setup-Wizard um, solange kein Moderator existiert
 * (First-Run), bzw. von /setup weg, sobald die Einrichtung abgeschlossen ist. */
export function SetupGate({ children }: SetupGateProps) {
  const location = useLocation();
  const [istEingerichtet, setIstEingerichtet] = useState<boolean | null>(() =>
    wurdeKuerzlichEingerichtet() ? true : null
  );

  useEffect(() => {
    if (wurdeKuerzlichEingerichtet()) {
      setIstEingerichtet(true);
      return;
    }
    let abgebrochen = false;
    holeSetupStatus()
      .then((status) => {
        if (!abgebrochen) setIstEingerichtet(status.ist_eingerichtet);
      })
      .catch(() => {
        if (!abgebrochen) setIstEingerichtet(true);
      });
    return () => {
      abgebrochen = true;
    };
  }, [location.pathname]);

  if (istEingerichtet === null) {
    return null;
  }

  if (!istEingerichtet && location.pathname !== "/setup") {
    return <Navigate to="/setup" replace />;
  }
  if (istEingerichtet && location.pathname === "/setup") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
