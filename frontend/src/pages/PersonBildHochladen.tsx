import { Fehlertext } from "../components/Fehlertext";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  holePersonBildReservierung,
  personBildReservierungEinloesen,
  type PersonBildReservierungInfo,
} from "../api/personBildReservierungen";
import { ApiError } from "../api/client";
import { Ladeanzeige } from "../components/Ladeanzeige";
import { texte } from "../i18n/texte";

export function PersonBildHochladen() {
  const t = texte.bild_hochladen;
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
        setLadeFehler(err instanceof ApiError ? String(err.detail) : t.reservierung_fehler)
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
      setFehler(err instanceof ApiError ? String(err.detail) : t.upload_fehler);
    } finally {
      setLaeuft(false);
    }
  }

  if (ladeFehler) {
    return (
      <div className="seite">
        <Fehlertext>{ladeFehler}</Fehlertext>
      </div>
    );
  }

  if (!info) {
    return (
      <div className="seite">
        <Ladeanzeige />
      </div>
    );
  }

  if (erfolg) {
    return (
      <div className="seite">
        <div className="karte">
          <h1>{t.gespeichert_titel}</h1>
          {vorschauUrl && (
            <img
              src={vorschauUrl}
              alt={t.hochgeladenes_foto_alt}
              style={{ width: 200, height: 200, borderRadius: 16, objectFit: "cover" }}
            />
          )}
          <p>
            {t.gespeichert_prefix} <strong>{info.person_name}</strong> {t.gespeichert_suffix}
          </p>
        </div>
      </div>
    );
  }

  if (info.bereits_eingeloest) {
    return (
      <div className="seite">
        <div className="karte">
          <h1>{t.bereits_genutzt_titel}</h1>
          <p>{t.bereits_genutzt_text}</p>
        </div>
      </div>
    );
  }

  if (info.abgelaufen) {
    return (
      <div className="seite">
        <div className="karte">
          <h1>{t.abgelaufen_titel}</h1>
          <p>{t.abgelaufen_text}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="seite">
      <div className="karte text-center">
        <h1>{t.profilfoto_prefix} {info.person_name}</h1>

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

        {fehler && <Fehlertext>{fehler}</Fehlertext>}

        <input
          ref={dateiEingabeRef}
          type="file"
          accept="image/png,image/jpeg"
          style={{ display: "none" }}
          onChange={(e) => dateiGewaehlt(e.target.files?.[0])}
        />
        <button
          type="button"
          disabled={laeuft}
          onClick={() => dateiEingabeRef.current?.click()}
          style={{ marginTop: "1rem" }}
        >
          {laeuft ? t.hochladen_laeuft : t.foto_aufnehmen}
        </button>
      </div>
    </div>
  );
}
