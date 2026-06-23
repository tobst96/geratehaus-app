import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../../context/AuthContext";
import { holeBuchungen, buchungAnfrage, buchungZurueckziehen } from "../../api/buchungen";
import { holeFahrzeuge } from "../../api/stammdaten";
import { ApiError } from "../../api/client";
import { BuchungsKalender } from "../../components/BuchungsKalender";
import type { BuchungOut, Fahrzeug } from "../../api/types";

function jetztAlsDatetimeLocal(minutenSpaeter = 0): string {
  const jetzt = new Date();
  jetzt.setMinutes(jetzt.getMinutes() - jetzt.getTimezoneOffset() + minutenSpaeter);
  return jetzt.toISOString().slice(0, 16);
}

export function Fahrzeugbuchung() {
  const { angezeigterName } = useAuth();
  const [buchungen, setBuchungen] = useState<BuchungOut[] | null>(null);
  const [fahrzeuge, setFahrzeuge] = useState<Fahrzeug[]>([]);
  const [fehler, setFehler] = useState<string | null>(null);
  const [hinweis, setHinweis] = useState<string | null>(null);

  const [formularOffen, setFormularOffen] = useState(false);
  const [fahrzeugId, setFahrzeugId] = useState("");
  const [von, setVon] = useState(jetztAlsDatetimeLocal());
  const [bis, setBis] = useState(jetztAlsDatetimeLocal(120));
  const [zweck, setZweck] = useState("");

  async function laden() {
    try {
      const [b, f] = await Promise.all([holeBuchungen(), holeFahrzeuge()]);
      setBuchungen(b);
      setFahrzeuge(f.filter((x) => x.buchbar));
      if (!fahrzeugId && f.length > 0) setFahrzeugId(String(f[0].id));
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Buchungen konnten nicht geladen werden.");
    }
  }

  useEffect(() => {
    laden();
  }, []);

  async function absenden(e: FormEvent) {
    e.preventDefault();
    if (!fahrzeugId || !zweck.trim()) return;
    setHinweis(null);
    try {
      const ergebnis = await buchungAnfrage({
        fahrzeug_id: Number(fahrzeugId),
        von: new Date(von).toISOString(),
        bis: new Date(bis).toISOString(),
        zweck: zweck.trim(),
      });
      setHinweis(
        ergebnis.konflikt_hinweis
          ? "Anfrage gespeichert – Achtung, es gibt eine Überschneidung mit einer anderen Buchung. Der Moderator entscheidet."
          : "Anfrage gespeichert."
      );
      setZweck("");
      setFormularOffen(false);
      await laden();
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Anfrage konnte nicht gestellt werden.");
    }
  }

  async function zurueckziehen(id: number) {
    try {
      await buchungZurueckziehen(id);
      await laden();
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Zurückziehen fehlgeschlagen.");
    }
  }

  if (fehler) return <div style={{ padding: "1rem", color: "red" }}>Fehler: {fehler}</div>;
  if (!buchungen) return <p>Lädt …</p>;

  const eigeneAusstehende = buchungen.filter(
    (b) => b.status === "ausstehend" && b.verantwortliche_person_name === angezeigterName
  );

  return (
    <div>
      <h1>Fahrzeugbuchung</h1>

      {!formularOffen && <button onClick={() => setFormularOffen(true)}>Neue Anfrage</button>}
      {hinweis && <p className="karte">{hinweis}</p>}
      {formularOffen && (
        <form onSubmit={absenden} className="karte">
          <label htmlFor="fb-fahrzeug">Fahrzeug</label>
          <select id="fb-fahrzeug" value={fahrzeugId} onChange={(e) => setFahrzeugId(e.target.value)} required>
            {fahrzeuge.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <br />
          <br />
          <label htmlFor="fb-von">Von</label>
          <input id="fb-von" type="datetime-local" value={von} onChange={(e) => setVon(e.target.value)} required />
          <br />
          <br />
          <label htmlFor="fb-bis">Bis</label>
          <input id="fb-bis" type="datetime-local" value={bis} onChange={(e) => setBis(e.target.value)} required />
          <br />
          <br />
          <label htmlFor="fb-zweck">Zweck</label>
          <input id="fb-zweck" value={zweck} onChange={(e) => setZweck(e.target.value)} required />
          <br />
          <br />
          <button type="submit">Anfrage stellen</button>{" "}
          <button type="button" className="sekundaer" onClick={() => setFormularOffen(false)}>
            Abbrechen
          </button>
        </form>
      )}

      {eigeneAusstehende.length > 0 && (
        <div className="karte">
          <h2>Meine ausstehenden Anfragen</h2>
          {eigeneAusstehende.map((b) => (
            <div key={b.id} style={{ marginBottom: 8 }}>
              {b.fahrzeug_name}: {new Date(b.von).toLocaleString("de-DE")} –{" "}
              {new Date(b.bis).toLocaleString("de-DE")} ({b.zweck}){" "}
              <button className="sekundaer" onClick={() => zurueckziehen(b.id)}>
                Zurückziehen
              </button>
            </div>
          ))}
        </div>
      )}

      <BuchungsKalender buchungen={buchungen} />
    </div>
  );
}
