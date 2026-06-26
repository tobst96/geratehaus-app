import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  holeMitgliedLoginReservierung,
  holeMitgliedLoginReservierungPersonen,
  mitgliedLoginAnmelden,
  type MitgliedLoginReservierungInfo,
} from "../../api/mitgliedLoginReservierungen";
import { ApiError } from "../../api/client";
import type { Person } from "../../api/types";

function initialenAus(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((teil) => teil.charAt(0))
    .join("")
    .toUpperCase();
}

export function MitgliedAnmelden() {
  const { token } = useParams<{ token: string }>();
  const [info, setInfo] = useState<MitgliedLoginReservierungInfo | null>(null);
  const [personen, setPersonen] = useState<Person[]>([]);
  const [ladeFehler, setLadeFehler] = useState<string | null>(null);

  const [suche, setSuche] = useState("");
  const [ausgewaehltePerson, setAusgewaehltePerson] = useState<Person | null>(null);
  const [pin, setPin] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);
  const [erfolg, setErfolg] = useState(false);

  useEffect(() => {
    if (!token) return;
    Promise.all([holeMitgliedLoginReservierung(token), holeMitgliedLoginReservierungPersonen(token)])
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

  async function bestaetigen() {
    if (!token || !ausgewaehltePerson) return;
    if (ausgewaehltePerson.pin_gesetzt && !/^\d{4,6}$/.test(pin)) {
      setFehler("Bitte den 4-6-stelligen PIN eingeben.");
      return;
    }
    setLaeuft(true);
    setFehler(null);
    try {
      await mitgliedLoginAnmelden(token, ausgewaehltePerson.id, ausgewaehltePerson.pin_gesetzt ? pin : null);
      setErfolg(true);
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Bestätigung fehlgeschlagen.");
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
          <h1>Bestätigt!</h1>
          <p>Das ursprüngliche Gerät meldet sich jetzt automatisch an. Du kannst diese Seite schließen.</p>
        </div>
      </div>
    );
  }

  if (info.eingeloest) {
    return (
      <div className="seite">
        <div className="karte">
          <h1>Bereits genutzt</h1>
          <p>Dieser QR-Code wurde bereits verwendet. Bitte einen neuen erzeugen lassen.</p>
        </div>
      </div>
    );
  }

  if (info.abgelaufen) {
    return (
      <div className="seite">
        <div className="karte">
          <h1>Abgelaufen</h1>
          <p>Dieser QR-Code ist abgelaufen. Bitte einen neuen erzeugen lassen.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="seite">
      <div className="karte">
        <h1>Wer bist du?</h1>

        {ausgewaehltePerson ? (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
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

            {ausgewaehltePerson.pin_gesetzt && (
              <>
                <label htmlFor="ma-pin">PIN</label>
                <input
                  id="ma-pin"
                  type="password"
                  inputMode="numeric"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="4-6-stelliger PIN"
                  autoFocus
                />
                <br />
                <br />
              </>
            )}

            {fehler && <p className="fehlertext">{fehler}</p>}

            <button type="button" disabled={laeuft} onClick={bestaetigen}>
              {laeuft ? "Wird bestätigt…" : "Bestätigen"}
            </button>
          </div>
        ) : (
          <>
            <input
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
                      onClick={() => setAusgewaehltePerson(p)}
                    >
                      {p.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
