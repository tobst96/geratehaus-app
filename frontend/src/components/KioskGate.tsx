import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiGet } from "../api/client";
import { KioskHome } from "../pages/KioskHome";
import { Ladeanzeige } from "./Ladeanzeige";

export function KioskGate() {
  const { token } = useParams<{ token: string }>();
  const [gueltig, setGueltig] = useState<boolean | null>(null);
  const [module, setModule] = useState<string[]>([]);

  useEffect(() => {
    if (!token) {
      setGueltig(false);
      return;
    }
    apiGet<{ gueltig: boolean; startseite_module: string[] }>(
      `/kiosk-tokens/${encodeURIComponent(token)}/validieren`
    )
      .then((r) => {
        setGueltig(r.gueltig);
        setModule(r.startseite_module ?? []);
        // Kiosk-Token merken, damit das Logo zurück zur Kiosk-Startseite führt
        // (statt zur öffentlichen Landing-/Login-Seite).
        if (r.gueltig) localStorage.setItem("kiosk_token", token);
      })
      .catch(() => setGueltig(false));
  }, [token]);

  if (gueltig === null) return <Ladeanzeige />;

  if (!gueltig) {
    return (
      <div className="seite">
        <div className="karte">
          <h1>Ungültiger Kiosk-Link</h1>
          <p>
            Dieser Link ist nicht (mehr) gültig. Bitte im Admin-Bereich unter "Kiosk-Geräte" einen neuen
            Link erzeugen.
          </p>
        </div>
      </div>
    );
  }

  return <KioskHome module={module} />;
}
