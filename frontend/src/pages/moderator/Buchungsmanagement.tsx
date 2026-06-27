import { useEffect, useState } from "react";
import {
  holeBuchungenListe,
  holeKonfliktvergleich,
  buchungGenehmigen,
  buchungAblehnen,
} from "../../api/moderator";
import { ApiError } from "../../api/client";
import type { BuchungOut } from "../../api/types";
import { Ladeanzeige } from "../../components/Ladeanzeige";

export function Buchungsmanagement() {
  const [buchungen, setBuchungen] = useState<BuchungOut[] | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [konflikte, setKonflikte] = useState<Record<number, BuchungOut[]>>({});
  const [ablehnungsgrund, setAblehnungsgrund] = useState<Record<number, string>>({});

  async function laden() {
    try {
      const liste = await holeBuchungenListe({ status: "ausstehend" });
      setBuchungen(liste);
      setFehler(null);
      const ergebnisse = await Promise.all(liste.map((b) => holeKonfliktvergleich(b.id)));
      const neueKonflikte: Record<number, BuchungOut[]> = {};
      liste.forEach((b, i) => {
        neueKonflikte[b.id] = ergebnisse[i];
      });
      setKonflikte(neueKonflikte);
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Buchungen konnten nicht geladen werden.");
    }
  }

  useEffect(() => {
    laden();
  }, []);

  async function genehmigen(id: number) {
    try {
      await buchungGenehmigen(id);
      await laden();
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Genehmigen fehlgeschlagen.");
    }
  }

  async function ablehnen(id: number) {
    try {
      await buchungAblehnen(id, ablehnungsgrund[id] || null);
      await laden();
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Ablehnen fehlgeschlagen.");
    }
  }

  if (fehler) return <p className="fehlertext">{fehler}</p>;
  if (!buchungen) return <Ladeanzeige />;

  return (
    <div>
      <h1>Buchungsmanagement</h1>
      <p>Ausstehende Anfragen ({buchungen.length})</p>

      {buchungen.length === 0 && <p>Keine ausstehenden Anfragen.</p>}
      {buchungen.map((b) => (
        <div key={b.id} className="karte">
          <strong>{b.fahrzeug_name}</strong> · {new Date(b.von).toLocaleString("de-DE")} –{" "}
          {new Date(b.bis).toLocaleString("de-DE")}
          <div>Zweck: {b.zweck}</div>
          <div>Verantwortlich: {b.verantwortliche_person_name}</div>

          {konflikte[b.id]?.length > 0 && (
            <div className="fehlertext" style={{ marginTop: 8 }}>
              Konflikt mit:
              <ul>
                {konflikte[b.id].map((k) => (
                  <li key={k.id}>
                    {k.fahrzeug_name}: {new Date(k.von).toLocaleString("de-DE")} –{" "}
                    {new Date(k.bis).toLocaleString("de-DE")} ({k.status})
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button onClick={() => genehmigen(b.id)}>Genehmigen</button>
            <input
              placeholder="Ablehnungsgrund (optional)"
              value={ablehnungsgrund[b.id] ?? ""}
              onChange={(e) => setAblehnungsgrund({ ...ablehnungsgrund, [b.id]: e.target.value })}
              style={{ flex: 1, minWidth: 200 }}
            />
            <button className="sekundaer" onClick={() => ablehnen(b.id)}>
              Ablehnen
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
