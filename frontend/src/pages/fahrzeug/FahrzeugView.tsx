import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { holeEinsaetze } from "../../api/einsaetze";
import { ApiError } from "../../api/client";
import type { EinsatzOut } from "../../api/types";
import { Ladeanzeige } from "../../components/Ladeanzeige";

export function FahrzeugView() {
  const { token } = useParams<{ token: string }>();
  const [einsaetze, setEinsaetze] = useState<EinsatzOut[] | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [fahrzeugName, setFahrzeugName] = useState("Fahrzeug");

  useEffect(() => {
    async function laden() {
      try {
        // In real scenario, would validate token and fetch vehicle-specific data
        // For now, load all einsaetze
        const e = await holeEinsaetze();
        setEinsaetze(e);
        // Extract fahrzeug name from token (simplified)
        setFahrzeugName(`Fahrzeug (${token?.substring(0, 6)})`);
      } catch (err) {
        setFehler(err instanceof ApiError ? String(err.detail) : "Fehler beim Laden");
      }
    }
    if (token) laden();
  }, [token]);

  if (!token) return <p>Invalid token</p>;
  if (fehler) return <div style={{ padding: "1rem", color: "red" }}>Fehler: {fehler}</div>;
  if (!einsaetze) return <Ladeanzeige />;

  return (
    <div style={{ padding: "1rem" }}>
      <h1>{fahrzeugName}</h1>
      <p>Aktive Einsätze zum Hinzufügen von Personen</p>

      {einsaetze.length === 0 && <p>Keine Einsätze verfügbar.</p>}

      {einsaetze.map((e) => (
        <div key={e.id} className="karte" style={{ marginBottom: "1rem" }}>
          <h3>{e.titel}</h3>
          <p style={{ fontSize: "0.9rem", color: "#666" }}>
            {new Date(e.zeitpunkt).toLocaleString("de-DE")} · {e.quelle}
          </p>
          <p>
            <strong>{e.teilnahmen.length}</strong> Teilnehmer
          </p>
          <div style={{ fontSize: "0.85rem", color: "#999", marginTop: "0.5rem" }}>
            Quelle: Gruppenführer vom {fahrzeugName}
          </div>
        </div>
      ))}

      <p style={{ fontSize: "0.8rem", color: "#999", marginTop: "2rem" }}>
        Token: {token}
      </p>
    </div>
  );
}
