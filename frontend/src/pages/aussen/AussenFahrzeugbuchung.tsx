import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { holeBuchungenAussen, buchungAnfrageAussen } from "../../api/buchungen";
import { holeFahrzeuge } from "../../api/stammdaten";
import { ApiError } from "../../api/client";
import { BuchungsKalender } from "../../components/BuchungsKalender";
import type { BuchungOut, Fahrzeug } from "../../api/types";

function jetztAlsDatetimeLocal(minutenSpaeter = 0): string {
  const jetzt = new Date();
  jetzt.setMinutes(jetzt.getMinutes() - jetzt.getTimezoneOffset() + minutenSpaeter);
  return jetzt.toISOString().slice(0, 16);
}

export function AussenFahrzeugbuchung() {
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
      const [b, f] = await Promise.all([holeBuchungenAussen(), holeFahrzeuge()]);
      setBuchungen(b);
      setFahrzeuge(f.filter((x) => x.buchbar));
      if (!fahrzeugId && f.length > 0) setFahrzeugId(String(f[0].id));
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Buchungen konnten nicht geladen werden.");
    }
  }

  useEffect(() => {
    laden();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function absenden(e: FormEvent) {
    e.preventDefault();
    if (!fahrzeugId || !zweck.trim()) return;
    setHinweis(null);
    try {
      const ergebnis = await buchungAnfrageAussen({
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

  return (
    <div>
      <p>
        <Link to="/aussen">← Zurück</Link>
      </p>
      <h1>Fahrzeugkalender</h1>

      {fehler && <p className="fehlertext">{fehler}</p>}
      {!fehler && !buchungen && <p>Lädt …</p>}

      {buchungen && (
        <>
          {!formularOffen && <button onClick={() => setFormularOffen(true)}>Neue Anfrage</button>}
          {hinweis && <p className="karte">{hinweis}</p>}
          {formularOffen && (
            <form onSubmit={absenden} className="karte">
              <label htmlFor="afb-fahrzeug">Fahrzeug</label>
              <select
                id="afb-fahrzeug"
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
              <label htmlFor="afb-von">Von</label>
              <input
                id="afb-von"
                type="datetime-local"
                value={von}
                onChange={(e) => setVon(e.target.value)}
                required
              />
              <br />
              <br />
              <label htmlFor="afb-bis">Bis</label>
              <input
                id="afb-bis"
                type="datetime-local"
                value={bis}
                onChange={(e) => setBis(e.target.value)}
                required
              />
              <br />
              <br />
              <label htmlFor="afb-zweck">Zweck</label>
              <input id="afb-zweck" value={zweck} onChange={(e) => setZweck(e.target.value)} required />
              <br />
              <br />
              <button type="submit">Anfrage stellen</button>{" "}
              <button type="button" className="sekundaer" onClick={() => setFormularOffen(false)}>
                Abbrechen
              </button>
            </form>
          )}

          <BuchungsKalender buchungen={buchungen} />
        </>
      )}
    </div>
  );
}
