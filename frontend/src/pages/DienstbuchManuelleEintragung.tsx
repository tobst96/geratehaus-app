import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import {
  dienstbuchReservierungEinloesen,
  dienstbuchReservierungVorschauSetzen,
  holeDienstbuchReservierung,
  holeDienstbuchReservierungPersonen,
} from "../api/dienstbuchReservierungen";
import { holeGruppen } from "../api/stammdaten";
import { ApiError } from "../api/client";
import { eintragungGesperrtMinuten, eintragungVermerken } from "../utils/eintragungssperre";
import { Ladeanzeige } from "../components/Ladeanzeige";
import type { DienstbuchReservierungInfo, Gruppe, Person } from "../api/types";

function initialenAus(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((teil) => teil.charAt(0))
    .join("")
    .toUpperCase();
}

export function DienstbuchManuelleEintragung() {
  const { token } = useParams<{ token: string }>();
  const [info, setInfo] = useState<DienstbuchReservierungInfo | null>(null);
  const [personen, setPersonen] = useState<Person[]>([]);
  const [gruppen, setGruppen] = useState<Gruppe[]>([]);
  const [ladeFehler, setLadeFehler] = useState<string | null>(null);

  const [suche, setSuche] = useState("");
  const [ausgewaehltePerson, setAusgewaehltePerson] = useState<Person | null>(null);
  const [gruppeId, setGruppeId] = useState<number | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);
  const [erfolg, setErfolg] = useState(false);
  const [gesperrtMinuten] = useState(() => eintragungGesperrtMinuten());

  useEffect(() => {
    if (!token) return;
    Promise.all([
      holeDienstbuchReservierung(token),
      holeDienstbuchReservierungPersonen(token),
      holeGruppen(),
    ])
      .then(([infoResult, personenResult, gruppenResult]) => {
        setInfo(infoResult);
        setPersonen(personenResult);
        setGruppen(gruppenResult);
      })
      .catch((err) =>
        setLadeFehler(err instanceof ApiError ? String(err.detail) : "Reservierung konnte nicht geladen werden.")
      );
  }, [token]);

  const trefferliste =
    suche.trim().length === 0
      ? []
      : personen.filter((p) => p.name.toLowerCase().includes(suche.trim().toLowerCase())).slice(0, 8);

  async function personAuswaehlen(p: Person) {
    setAusgewaehltePerson(p);
    setGruppeId(p.gruppe_id);
    setSuche("");
    try {
      if (token) await dienstbuchReservierungVorschauSetzen(token, p.id);
    } catch {
      // Best effort – die Vorschau am Gerätehaus ist nur ein Komfortfeature.
    }
  }

  async function absenden(e: FormEvent) {
    e.preventDefault();
    if (!token || !ausgewaehltePerson) return;
    setLaeuft(true);
    setFehler(null);
    try {
      await dienstbuchReservierungEinloesen(token, {
        person_id: ausgewaehltePerson.id,
        gruppe_id: gruppeId,
      });
      eintragungVermerken();
      setErfolg(true);
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Eintragung fehlgeschlagen.");
    } finally {
      setLaeuft(false);
    }
  }

  if (gesperrtMinuten !== null) {
    return (
      <div className="seite">
        <div className="karte">
          <h1>Kurz gewartet</h1>
          <p>
            Du hast dich auf diesem Gerät vor Kurzem bereits eingetragen. Bitte warte noch ca.{" "}
            {gesperrtMinuten} {gesperrtMinuten === 1 ? "Minute" : "Minuten"}, bevor du es erneut
            versuchst.
          </p>
        </div>
      </div>
    );
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
        <Ladeanzeige />
      </div>
    );
  }

  if (erfolg) {
    return (
      <div className="seite">
        <div className="karte">
          <h1>Eingetragen!</h1>
          <p>
            Du wurdest für das Dienstbuch „{info.dienstbuch_titel}“ eingetragen. Du kannst diese Seite
            jetzt schließen.
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
        <p style={{ color: "#666" }}>Dienstbuch „{info.dienstbuch_titel}“</p>

        <form onSubmit={absenden}>
          <div className="formular-feld">
          <label htmlFor="dbme-person">Wer bist du?</label>
          {ausgewaehltePerson ? (
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
              {ausgewaehltePerson.bild_url ? (
                <img
                  src={ausgewaehltePerson.bild_url}
                  alt={ausgewaehltePerson.name}
                  style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover" }}
                />
              ) : (
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    background: "var(--farbe-primaer, #ffa633)",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                  }}
                >
                  {initialenAus(ausgewaehltePerson.name)}
                </div>
              )}
              <strong>{ausgewaehltePerson.name}</strong>
              <button type="button" className="sekundaer" onClick={() => setAusgewaehltePerson(null)}>
                Ändern
              </button>
            </div>
          ) : (
            <>
              <input
                id="dbme-person"
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
                        onClick={() => personAuswaehlen(p)}
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
          </div>

          <div className="formular-feld">
            <label htmlFor="dbme-gruppe">Gruppe</label>
            <select
              id="dbme-gruppe"
              value={gruppeId ?? ""}
              onChange={(e) => setGruppeId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">– keine –</option>
              {gruppen.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          {fehler && <p className="fehlertext">{fehler}</p>}

          <button type="submit" disabled={laeuft || !ausgewaehltePerson}>
            {laeuft ? "Wird gespeichert…" : "Eintragen"}
          </button>
        </form>
      </div>
    </div>
  );
}
