import { useEffect, useState, type FormEvent } from "react";
import { stundenErfassen, holeMeineSummen } from "../../api/dienststunden";
import { holeFunktionenDienststunden } from "../../api/stammdaten";
import { ApiError } from "../../api/client";
import type { DienststundenSummeOut, FunktionDienststunden } from "../../api/types";

function heuteAlsDatum(): string {
  return new Date().toISOString().slice(0, 10);
}

export function Dienststunden() {
  const [summen, setSummen] = useState<DienststundenSummeOut[] | null>(null);
  const [funktionen, setFunktionen] = useState<FunktionDienststunden[]>([]);
  const [fehler, setFehler] = useState<string | null>(null);
  const [erfolg, setErfolg] = useState<string | null>(null);

  const [funktionId, setFunktionId] = useState<string>("");
  const [stunden, setStunden] = useState<number>(1);
  const [datum, setDatum] = useState(heuteAlsDatum());

  async function laden() {
    try {
      const [s, f] = await Promise.all([holeMeineSummen(), holeFunktionenDienststunden()]);
      setSummen(s);
      setFunktionen(f);
      if (!funktionId && f.length > 0) setFunktionId(String(f[0].id));
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Dienststunden konnten nicht geladen werden.");
    }
  }

  useEffect(() => {
    laden();
  }, []);

  async function absenden(e: FormEvent) {
    e.preventDefault();
    if (!funktionId) return;
    setErfolg(null);
    try {
      await stundenErfassen(Number(funktionId), stunden, datum);
      setErfolg("Stunden erfasst.");
      await laden();
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Stunden konnten nicht erfasst werden.");
    }
  }

  if (fehler) return <div style={{ padding: "1rem", color: "red" }}>Fehler: {fehler}</div>;
  if (!summen) return <p>Lädt …</p>;

  return (
    <div>
      <h1>Dienststunden</h1>

      <div className="karte">
        <h2>Stunden erfassen</h2>
        <form onSubmit={absenden}>
          <label htmlFor="ds-funktion">Funktion</label>
          <select id="ds-funktion" value={funktionId} onChange={(e) => setFunktionId(e.target.value)} required>
            {funktionen.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <br />
          <br />
          <label htmlFor="ds-stunden">Stunden</label>
          <input
            id="ds-stunden"
            type="number"
            min={0.5}
            step={0.5}
            value={stunden}
            onChange={(e) => setStunden(Number(e.target.value))}
            required
          />
          <br />
          <br />
          <label htmlFor="ds-datum">Datum</label>
          <input id="ds-datum" type="date" value={datum} onChange={(e) => setDatum(e.target.value)} required />
          <br />
          <br />
          {erfolg && <p>{erfolg}</p>}
          <button type="submit">Erfassen</button>
        </form>
      </div>

      <h2>Meine kumulierten Stunden</h2>
      <table>
        <thead>
          <tr>
            <th>Funktion</th>
            <th>Stunden</th>
            <th>Schwellenwert</th>
          </tr>
        </thead>
        <tbody>
          {summen.map((s) => (
            <tr key={s.funktion_id}>
              <td>{s.funktion_name}</td>
              <td style={{ color: s.schwellenwert_ueberschritten ? "#b00020" : undefined, fontWeight: s.schwellenwert_ueberschritten ? 700 : undefined }}>
                {s.summe_stunden}
              </td>
              <td>{s.schwellenwert_stunden || "–"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
