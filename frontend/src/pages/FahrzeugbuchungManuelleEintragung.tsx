import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import {
  fahrzeugbuchungReservierungEinloesen,
  fahrzeugbuchungReservierungVorschauSetzen,
  holeFahrzeugbuchungReservierung,
  holeFahrzeugbuchungReservierungPersonen,
} from "../api/fahrzeugbuchungReservierungen";
import { holeFahrzeuge } from "../api/stammdaten";
import { ApiError } from "../api/client";
import type { Fahrzeug, FahrzeugbuchungReservierungInfo, Person } from "../api/types";

function initialenAus(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((teil) => teil.charAt(0))
    .join("")
    .toUpperCase();
}

function jetztAlsDatetimeLocal(minutenSpaeter = 0): string {
  const jetzt = new Date();
  jetzt.setMinutes(jetzt.getMinutes() - jetzt.getTimezoneOffset() + minutenSpaeter);
  return jetzt.toISOString().slice(0, 16);
}

export function FahrzeugbuchungManuelleEintragung() {
  const { token } = useParams<{ token: string }>();
  const [info, setInfo] = useState<FahrzeugbuchungReservierungInfo | null>(null);
  const [personen, setPersonen] = useState<Person[]>([]);
  const [fahrzeuge, setFahrzeuge] = useState<Fahrzeug[]>([]);
  const [ladeFehler, setLadeFehler] = useState<string | null>(null);

  const [suche, setSuche] = useState("");
  const [ausgewaehltePerson, setAusgewaehltePerson] = useState<Person | null>(null);
  const [fahrzeugId, setFahrzeugId] = useState("");
  const [von, setVon] = useState(jetztAlsDatetimeLocal());
  const [bis, setBis] = useState(jetztAlsDatetimeLocal(120));
  const [zweck, setZweck] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);
  const [erfolg, setErfolg] = useState(false);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      holeFahrzeugbuchungReservierung(token),
      holeFahrzeugbuchungReservierungPersonen(token),
      holeFahrzeuge(),
    ])
      .then(([infoResult, personenResult, fahrzeugeResult]) => {
        setInfo(infoResult);
        setPersonen(personenResult);
        const buchbar = fahrzeugeResult.filter((f) => f.buchbar);
        setFahrzeuge(buchbar);
        if (buchbar.length > 0) setFahrzeugId(String(buchbar[0].id));
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
    setSuche("");
    try {
      if (token) await fahrzeugbuchungReservierungVorschauSetzen(token, p.id);
    } catch {
      // Best effort – die Vorschau am Gerätehaus ist nur ein Komfortfeature.
    }
  }

  async function absenden(e: FormEvent) {
    e.preventDefault();
    if (!token || !ausgewaehltePerson || !fahrzeugId || !zweck.trim()) return;
    setLaeuft(true);
    setFehler(null);
    try {
      await fahrzeugbuchungReservierungEinloesen(token, {
        person_id: ausgewaehltePerson.id,
        fahrzeug_id: Number(fahrzeugId),
        von: new Date(von).toISOString(),
        bis: new Date(bis).toISOString(),
        zweck: zweck.trim(),
      });
      setErfolg(true);
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Anfrage konnte nicht gestellt werden.");
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
          <h1>Anfrage gestellt!</h1>
          <p>Deine Fahrzeugbuchung wurde angefragt. Du kannst diese Seite jetzt schließen.</p>
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
        <h1>Fahrzeugbuchung ohne Barcode anfragen</h1>

        <form onSubmit={absenden}>
          <label htmlFor="fbme-person">Wer bist du?</label>
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
                id="fbme-person"
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
          <br />
          <br />

          <label htmlFor="fbme-fahrzeug">Fahrzeug</label>
          <select
            id="fbme-fahrzeug"
            value={fahrzeugId}
            onChange={(e) => setFahrzeugId(e.target.value)}
            required
          >
            {fahrzeuge.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <br />
          <br />

          <label htmlFor="fbme-von">Von</label>
          <input
            id="fbme-von"
            type="datetime-local"
            value={von}
            onChange={(e) => setVon(e.target.value)}
            required
          />
          <br />
          <br />

          <label htmlFor="fbme-bis">Bis</label>
          <input
            id="fbme-bis"
            type="datetime-local"
            value={bis}
            onChange={(e) => setBis(e.target.value)}
            required
          />
          <br />
          <br />

          <label htmlFor="fbme-zweck">Zweck</label>
          <input id="fbme-zweck" value={zweck} onChange={(e) => setZweck(e.target.value)} required />
          <br />
          <br />

          {fehler && <p className="fehlertext">{fehler}</p>}

          <button type="submit" disabled={laeuft || !ausgewaehltePerson}>
            {laeuft ? "Wird gestellt…" : "Anfrage stellen"}
          </button>
        </form>
      </div>
    </div>
  );
}
