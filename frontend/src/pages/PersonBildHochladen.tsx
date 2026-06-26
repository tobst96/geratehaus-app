import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  holePersonBildReservierung,
  personBildReservierungEinloesen,
  type PersonBildReservierungInfo,
} from "../api/personBildReservierungen";
import { ApiError } from "../api/client";

export function PersonBildHochladen() {
  const { token } = useParams<{ token: string }>();
  const [info, setInfo] = useState<PersonBildReservierungInfo | null>(null);
  const [ladeFehler, setLadeFehler] = useState<string | null>(null);
  const [vorschauUrl, setVorschauUrl] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [erfolg, setErfolg] = useState(false);
  const dateiEingabeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!token) return;
    holePersonBildReservierung(token)
      .then(setInfo)
      .catch((err) =>
        setLadeFehler(err instanceof ApiError ? String(err.detail) : "Reservierung konnte nicht geladen werden.")
      );
  }, [token]);

  async function dateiGewaehlt(datei: File | undefined) {
    if (!datei || !token) return;
    setVorschauUrl(URL.createObjectURL(datei));
    setLaeuft(true);
    setFehler(null);
    try {
      await personBildReservierungEinloesen(token, datei);
      setErfolg(true);
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Foto konnte nicht hochgeladen werden.");
    } finally {
      setLaeuft(false);
    }
  }

  if (ladeFehler) {
    return (
      <div className="seite">
        <p className="fehlertext">{ladeFehler}</p>
      </div>
    );
  }

  if (!info) {
    return (
      <div className="seite">
        <p>Lädt …</p>
      </div>
    );
  }

  if (erfolg) {
    return (
      <div className="seite">
        <div className="karte">
          <h1>Foto gespeichert!</h1>
          {vorschauUrl && (
            <img
              src={vorschauUrl}
              alt="Hochgeladenes Foto"
              style={{ width: 200, height: 200, borderRadius: 16, objectFit: "cover" }}
            />
          )}
          <p>
            Das Profilfoto für <strong>{info.person_name}</strong> wurde gespeichert. Du kannst diese
            Seite jetzt schließen.
          </p>
        </div>
      </div>
    );
  }

  if (info.bereits_eingeloest) {
    return (
      <div className="seite">
        <div className="karte">
          <h1>Bereits genutzt</h1>
          <p>Dieser QR-Code wurde bereits verwendet. Bitte am Gerätehaus einen neuen erzeugen lassen.</p>
        </div>
      </div>
    );
  }

  if (info.abgelaufen) {
    return (
      <div className="seite">
        <div className="karte">
          <h1>Abgelaufen</h1>
          <p>Dieser QR-Code ist abgelaufen. Bitte am Gerätehaus einen neuen erzeugen lassen.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="seite">
      <div className="karte" style={{ textAlign: "center" }}>
        <h1>Profilfoto für {info.person_name}</h1>

        {(vorschauUrl || info.person_bild_url) && (
          <img
            src={vorschauUrl ?? info.person_bild_url ?? undefined}
            alt={info.person_name}
            style={{
              width: 200,
              height: 200,
              borderRadius: 16,
              objectFit: "cover",
              margin: "1rem auto",
              display: "block",
            }}
          />
        )}

        {fehler && <p className="fehlertext">{fehler}</p>}

        <input
          ref={dateiEingabeRef}
          type="file"
          accept="image/png,image/jpeg"
          capture="environment"
          style={{ display: "none" }}
          onChange={(e) => dateiGewaehlt(e.target.files?.[0])}
        />
        <button
          type="button"
          disabled={laeuft}
          onClick={() => dateiEingabeRef.current?.click()}
          style={{ marginTop: "1rem" }}
        >
          {laeuft ? "Wird hochgeladen…" : "Foto aufnehmen oder auswählen"}
        </button>
      </div>
    </div>
  );
}
