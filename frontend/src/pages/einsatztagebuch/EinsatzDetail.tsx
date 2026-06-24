import { useEffect, useState, type FormEvent } from "react";
import { useParams, Link } from "react-router-dom";
import { holeEinsatz, teilnahmeEintragen, einsatzPdfUrl } from "../../api/einsaetze";
import { holeFahrzeuge, holeFunktionenEinsatz } from "../../api/stammdaten";
import { ApiError } from "../../api/client";
import type { EinsatzOut, Fahrzeug, FunktionEinsatz } from "../../api/types";

export function EinsatzDetail() {
  const { id } = useParams<{ id: string }>();
  const [einsatz, setEinsatz] = useState<EinsatzOut | null>(null);
  const [fahrzeuge, setFahrzeuge] = useState<Fahrzeug[]>([]);
  const [funktionen, setFunktionen] = useState<FunktionEinsatz[]>([]);
  const [fehler, setFehler] = useState<string | null>(null);

  const [fahrzeugId, setFahrzeugId] = useState<string>("");
  const [funktionId, setFunktionId] = useState<string>("");
  const [vab, setVab] = useState(false);
  const [atemschutzminuten, setAtemschutzminuten] = useState(0);
  const [nurGeraetehaus, setNurGeraetehaus] = useState(false);

  async function laden() {
    if (!id) return;
    try {
      const [e, f, fn] = await Promise.all([
        holeEinsatz(Number(id)),
        holeFahrzeuge(),
        holeFunktionenEinsatz(),
      ]);
      setEinsatz(e);
      setFahrzeuge(f);
      setFunktionen(fn);
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Einsatz konnte nicht geladen werden.");
    }
  }

  useEffect(() => {
    laden();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function teilnahmeAbsenden(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    try {
      await teilnahmeEintragen(Number(id), {
        fahrzeug_id: fahrzeugId ? Number(fahrzeugId) : null,
        sitzplatz_id: null,
        funktion_id: funktionId ? Number(funktionId) : null,
        vab,
        atemschutzminuten,
        nur_geraetehaus: nurGeraetehaus,
        bemerkung: null,
      });
      await laden();
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Teilnahme konnte nicht gespeichert werden.");
    }
  }

  if (fehler) return <div style={{ padding: "1rem", color: "red" }}>Fehler: {fehler}</div>;
  if (!einsatz) return <p>Lädt …</p>;

  return (
    <div>
      <p>
        <Link to="/einsatztagebuch">← Zurück zum Einsatztagebuch</Link>
      </p>
      <h1>{einsatz.titel}</h1>
      <p>
        {new Date(einsatz.zeitpunkt).toLocaleString("de-DE")} · {einsatz.quelle} · {einsatz.status}
      </p>
      <p>
        <a href={einsatzPdfUrl(einsatz.id)} target="_blank" rel="noreferrer">
          Als PDF exportieren
        </a>
      </p>

      <div className="karte">
        <h2>Teilnahme eintragen</h2>
        <form onSubmit={teilnahmeAbsenden}>
          <label htmlFor="fahrzeug">Fahrzeug</label>
          <select id="fahrzeug" value={fahrzeugId} onChange={(e) => setFahrzeugId(e.target.value)}>
            <option value="">–</option>
            {fahrzeuge.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <br />
          <br />
          <label htmlFor="funktion">Funktion</label>
          <select id="funktion" value={funktionId} onChange={(e) => setFunktionId(e.target.value)}>
            <option value="">–</option>
            {funktionen.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <br />
          <br />
          <label>
            <input type="checkbox" checked={vab} onChange={(e) => setVab(e.target.checked)} /> VAB
          </label>
          <br />
          <br />
          <label htmlFor="atemschutz">Atemschutzminuten</label>
          <input
            id="atemschutz"
            type="number"
            min={0}
            value={atemschutzminuten}
            onChange={(e) => setAtemschutzminuten(Number(e.target.value))}
          />
          <br />
          <br />
          <label>
            <input
              type="checkbox"
              checked={nurGeraetehaus}
              onChange={(e) => setNurGeraetehaus(e.target.checked)}
            />{" "}
            Nur Gerätehaus
          </label>
          <br />
          <br />
          <button type="submit">Speichern</button>
        </form>
      </div>

      <h2>Teilnehmer ({einsatz.teilnahmen.length})</h2>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Fahrzeug</th>
            <th>Funktion</th>
            <th>VAB</th>
            <th>Atemschutz</th>
            <th>Nur Gerätehaus</th>
            <th>Bemerkung</th>
          </tr>
        </thead>
        <tbody>
          {einsatz.teilnahmen.map((t) => (
            <tr key={t.id}>
              <td>{t.person_name}</td>
              <td>{t.fahrzeug_name ?? ""}</td>
              <td>{t.funktion_name ?? ""}</td>
              <td>{t.vab ? "Ja" : ""}</td>
              <td>{t.atemschutzminuten || ""}</td>
              <td>{t.nur_geraetehaus ? "Ja" : ""}</td>
              <td>{t.bemerkung ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
