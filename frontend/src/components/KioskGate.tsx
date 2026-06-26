import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiGet } from "../api/client";
import { KioskHome } from "../pages/KioskHome";

export function KioskGate() {
  const { token } = useParams<{ token: string }>();
  const [gueltig, setGueltig] = useState<boolean | null>(null);

  useEffect(() => {
    if (!token) {
      setGueltig(false);
      return;
    }
    apiGet<{ gueltig: boolean }>(`/kiosk-tokens/${encodeURIComponent(token)}/validieren`)
      .then((r) => setGueltig(r.gueltig))
      .catch(() => setGueltig(false));
  }, [token]);

  if (gueltig === null) return <p>Lädt …</p>;

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

  return <KioskHome />;
}
