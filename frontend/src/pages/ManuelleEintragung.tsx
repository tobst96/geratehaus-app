import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { holeReservierung, reservierungEinloesen } from "../api/reservierungen";
import { ApiError } from "../api/client";
import type { ReservierungInfo } from "../api/types";

const AGT_MAX_MINUTEN = 35;
const AGT_DEFAULT_MINUTEN = 30;

export function ManuelleEintragung() {
  const { token } = useParams<{ token: string }>();
  const [info, setInfo] = useState<ReservierungInfo | null>(null);
  const [ladeFehler, setLadeFehler] = useState<string | null>(null);

  const [vorname, setVorname] = useState("");
  const [zwischenname, setZwischenname] = useState("");
  const [nachname, setNachname] = useState("");
  const [vab, setVab] = useState(false);
  const [atemschutzminuten, setAtemschutzminuten] = useState(AGT_DEFAULT_MINUTEN);
  const [bemerkung, setBemerkung] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);
  const [erfolg, setErfolg] = useState(false);

  useEffect(() => {
    if (!token) return;
    holeReservierung(token)
      .then(setInfo)
      .catch((err) => setLadeFehler(err instanceof ApiError ? String(err.detail) : "Reservierung konnte nicht geladen werden."));
  }, [token]);

  async function absenden(e: FormEvent) {
    e.preventDefault();
    if (!token || !vorname.trim() || !nachname.trim()) return;
    setLaeuft(true);
    setFehler(null);
    try {
      await reservierungEinloesen(token, {
        vorname: vorname.trim(),
        zwischenname: zwischenname.trim() || null,
        nachname: nachname.trim(),
        vab,
        atemschutzminuten,
        bemerkung: bemerkung.trim() || null,
      });
      setErfolg(true);
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Eintragung fehlgeschlagen.");
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
          <h1>Eingetragen!</h1>
          <p>
            Du wurdest für <strong>{info.bezeichnung}</strong> im Einsatz „{info.einsatz_titel}“
            eingetragen. Du kannst diese Seite jetzt schließen.
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
          <p>Diese Reservierung wurde bereits verwendet. Bitte am Gerätehaus einen neuen QR-Code erzeugen.</p>
        </div>
      </div>
    );
  }

  if (info.abgelaufen) {
    return (
      <div className="seite">
        <div className="karte">
          <h1>Abgelaufen</h1>
          <p>Diese Reservierung ist abgelaufen. Bitte am Gerätehaus einen neuen QR-Code erzeugen.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="seite">
      <div className="karte">
        <h1>Ohne Barcode eintragen</h1>
        <p style={{ color: "#666" }}>
          {info.bezeichnung} · Einsatz „{info.einsatz_titel}“
          {info.fahrzeug_name ? ` · ${info.fahrzeug_name}` : ""}
        </p>

        <form onSubmit={absenden}>
          <label htmlFor="me-vorname">Vorname</label>
          <input id="me-vorname" value={vorname} onChange={(e) => setVorname(e.target.value)} required />
          <br />
          <br />
          <label htmlFor="me-zwischenname">Zwischenname (optional)</label>
          <input
            id="me-zwischenname"
            value={zwischenname}
            onChange={(e) => setZwischenname(e.target.value)}
          />
          <br />
          <br />
          <label htmlFor="me-nachname">Nachname</label>
          <input id="me-nachname" value={nachname} onChange={(e) => setNachname(e.target.value)} required />
          <br />
          <br />

          {!info.nur_geraetehaus && !info.auf_anfahrt && (
            <>
              <label>
                <input type="checkbox" checked={vab} onChange={(e) => setVab(e.target.checked)} /> VAB
              </label>
              <br />
              <br />

              <label htmlFor="me-atemschutz">
                Atemschutzminuten: <strong>{atemschutzminuten}</strong>
              </label>
              <input
                id="me-atemschutz"
                type="range"
                min={0}
                max={AGT_MAX_MINUTEN}
                step={1}
                value={atemschutzminuten}
                onChange={(e) => setAtemschutzminuten(Number(e.target.value))}
                style={{ width: "100%" }}
              />
              <br />
              <br />
            </>
          )}

          <label htmlFor="me-bemerkung">Bemerkung (optional)</label>
          <textarea
            id="me-bemerkung"
            rows={2}
            value={bemerkung}
            onChange={(e) => setBemerkung(e.target.value)}
            placeholder="Notizen…"
          />
          <br />
          <br />

          {fehler && <p className="fehlertext">{fehler}</p>}

          <button type="submit" disabled={laeuft}>
            {laeuft ? "Wird gespeichert…" : "Eintragen"}
          </button>
        </form>
      </div>
    </div>
  );
}
