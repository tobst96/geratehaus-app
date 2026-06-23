import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { holeMeineSummenAussen } from "../../api/dienststunden";
import { ApiError } from "../../api/client";
import type { DienststundenSummeOut } from "../../api/types";

export function AussenDienststunden() {
  const [summen, setSummen] = useState<DienststundenSummeOut[] | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);

  useEffect(() => {
    holeMeineSummenAussen()
      .then(setSummen)
      .catch((err) =>
        setFehler(err instanceof ApiError ? String(err.detail) : "Dienststunden konnten nicht geladen werden.")
      );
  }, []);

  return (
    <div>
      <p>
        <Link to="/aussen">← Zurück</Link>
      </p>
      <h1>Meine Dienststunden</h1>
      {fehler && <p className="fehlertext">{fehler}</p>}
      {!fehler && !summen && <p>Lädt …</p>}
      {summen && (
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
                <td
                  style={{
                    color: s.schwellenwert_ueberschritten ? "#b00020" : undefined,
                    fontWeight: s.schwellenwert_ueberschritten ? 700 : undefined,
                  }}
                >
                  {s.summe_stunden}
                </td>
                <td>{s.schwellenwert_stunden || "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
