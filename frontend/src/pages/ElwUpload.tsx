import { Fehlertext } from "../components/Fehlertext";
import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { holeElwEinsatz, elwDateiHochladen, type ElwEinsatzInfo } from "../api/elw";
import { ApiError } from "../api/client";
import { Ladeanzeige } from "../components/Ladeanzeige";
import { formatiereDatumZeit } from "../utils/datum";
import { texte } from "../i18n/texte";

const t = texte.elw;

type Ladezustand =
  | { art: "laedt" }
  | { art: "ok"; info: ElwEinsatzInfo }
  | { art: "geschlossen" }
  | { art: "ungueltig" };

export function ElwUpload() {
  const { token } = useParams<{ token: string }>();
  const [zustand, setZustand] = useState<Ladezustand>({ art: "laedt" });
  const [datei, setDatei] = useState<File | null>(null);
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [erfolg, setErfolg] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    holeElwEinsatz(token)
      .then((info) => setZustand({ art: "ok", info }))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 410) setZustand({ art: "geschlossen" });
        else setZustand({ art: "ungueltig" });
      });
  }, [token]);

  async function hochladen(e: FormEvent) {
    e.preventDefault();
    if (!token || !datei) return;
    setLaeuft(true);
    setFehler(null);
    setErfolg(null);
    try {
      const antwort = await elwDateiHochladen(token, datei);
      setErfolg(antwort.dateiname);
      setDatei(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 410) {
        setZustand({ art: "geschlossen" });
      } else {
        setFehler(err instanceof ApiError ? String(err.detail) : t.fehler_upload);
      }
    } finally {
      setLaeuft(false);
    }
  }

  if (zustand.art === "laedt") return <Ladeanzeige />;
  if (zustand.art === "geschlossen")
    return (
      <div className="karte" style={{ maxWidth: 520, margin: "2rem auto" }}>
        <h1>{t.geschlossen_titel}</h1>
        <p className="text-mute">{t.geschlossen_text}</p>
      </div>
    );
  if (zustand.art === "ungueltig")
    return (
      <div className="karte" style={{ maxWidth: 520, margin: "2rem auto" }}>
        <h1>{t.ungueltig_titel}</h1>
        <p className="text-mute">{t.ungueltig_text}</p>
      </div>
    );

  const { info } = zustand;
  return (
    <div className="karte" style={{ maxWidth: 520, margin: "2rem auto" }}>
      <h1>{t.titel}</h1>
      <p>
        <strong>{t.einsatz_prefix}</strong> {info.titel}
        {info.zeitpunkt ? ` · ${formatiereDatumZeit(info.zeitpunkt)}` : ""}
      </p>
      <p className="text-mute">{t.hinweis}</p>

      <form onSubmit={hochladen} style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
        <label>
          {t.datei_waehlen}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,application/pdf"
            onChange={(e) => {
              setDatei(e.target.files?.[0] ?? null);
              setErfolg(null);
              setFehler(null);
            }}
          />
        </label>
        {fehler && <Fehlertext>{fehler}</Fehlertext>}
        {erfolg && (
          <p style={{ color: "var(--farbe-erfolg, green)" }}>
            ✓ {t.erfolg_prefix} {erfolg}
          </p>
        )}
        <button type="submit" disabled={!datei || laeuft}>
          {laeuft ? t.laedt_hoch : erfolg ? t.weitere_hochladen : t.hochladen}
        </button>
      </form>
    </div>
  );
}
