import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { holeReservierung, holeReservierungPersonen, reservierungEinloesen } from "../api/reservierungen";
import { ApiError } from "../api/client";
import type { Person, ReservierungInfo } from "../api/types";

const AGT_MAX_MINUTEN = 35;
const AGT_DEFAULT_MINUTEN = 30;

export function ManuelleEintragung() {
  const { token } = useParams<{ token: string }>();
  const [info, setInfo] = useState<ReservierungInfo | null>(null);
  const [personen, setPersonen] = useState<Person[]>([]);
  const [ladeFehler, setLadeFehler] = useState<string | null>(null);

  const [suche, setSuche] = useState("");
  const [ausgewaehltePerson, setAusgewaehltePerson] = useState<Person | null>(null);
  const [vab, setVab] = useState(false);
  const [atemschutzminuten, setAtemschutzminuten] = useState(AGT_DEFAULT_MINUTEN);
  const [bemerkung, setBemerkung] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);
  const [erfolg, setErfolg] = useState(false);

  useEffect(() => {
    if (!token) return;
    Promise.all([holeReservierung(token), holeReservierungPersonen(token)])
      .then(([infoResult, personenResult]) => {
        setInfo(infoResult);
        setPersonen(personenResult);
      })
      .catch((err) =>
        setLadeFehler(err instanceof ApiError ? String(err.detail) : "Reservierung konnte nicht geladen werden.")
      );
  }, [token]);

  const trefferliste =
    suche.trim().length === 0
      ? []
      : personen.filter((p) => p.name.toLowerCase().includes(suche.trim().toLowerCase())).slice(0, 8);

  async function absenden(e: FormEvent) {
    e.preventDefault();
    if (!token || !ausgewaehltePerson) return;
    setLaeuft(true);
    setFehler(null);
    try {
      await reservierungEinloesen(token, {
        person_id: ausgewaehltePerson.id,
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
          <label htmlFor="me-person">Wer bist du?</label>
          {ausgewaehltePerson ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
              <strong>{ausgewaehltePerson.name}</strong>
              <button type="button" className="sekundaer" onClick={() => setAusgewaehltePerson(null)}>
                Ändern
              </button>
            </div>
          ) : (
            <>
              <input
                id="me-person"
                value={suche}
                onChange={(e) => setSuche(e.target.value)}
                placeholder="Namen eingeben und auswählen…"
                autoFocus
              />
              {trefferliste.length > 0 && (
                <ul style={{ listStyle: "none", padding: 0, margin: "0.25rem 0" }}>
                  {trefferliste.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        className="sekundaer"
                        style={{ width: "100%", textAlign: "left" }}
                        onClick={() => {
                          setAusgewaehltePerson(p);
                          setSuche("");
                        }}
                      >
                        {p.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {suche.trim().length > 0 && trefferliste.length === 0 && (
                <p style={{ color: "#999", fontSize: "0.85rem" }}>
                  Keine Person gefunden. Bitte am Gerätehaus in den Personen-Stammdaten anlegen lassen.
                </p>
              )}
            </>
          )}
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

          <button type="submit" disabled={laeuft || !ausgewaehltePerson}>
            {laeuft ? "Wird gespeichert…" : "Eintragen"}
          </button>
        </form>
      </div>
    </div>
  );
}
