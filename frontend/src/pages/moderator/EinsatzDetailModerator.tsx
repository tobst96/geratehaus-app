import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { holeEinsatz, holeEinsatzFelder, einsatzPdfUrl } from "../../api/einsaetze";
import { holeFahrzeuge } from "../../api/stammdaten";
import { ApiError } from "../../api/client";
import type { EinsatzFeldDefinition, EinsatzOut, Fahrzeug } from "../../api/types";

export function EinsatzDetailModerator() {
  const { id } = useParams<{ id: string }>();
  const [einsatz, setEinsatz] = useState<EinsatzOut | null>(null);
  const [felder, setFelder] = useState<EinsatzFeldDefinition[]>([]);
  const [fahrzeuge, setFahrzeuge] = useState<Fahrzeug[]>([]);
  const [fehler, setFehler] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([holeEinsatz(Number(id)), holeEinsatzFelder(), holeFahrzeuge()])
      .then(([e, f, fz]) => {
        setEinsatz(e);
        setFelder(f);
        setFahrzeuge(fz);
      })
      .catch((err) => setFehler(err instanceof ApiError ? String(err.detail) : "Einsatz konnte nicht geladen werden."));
  }, [id]);

  if (fehler) return <p className="fehlertext">{fehler}</p>;
  if (!einsatz) return <p>Lädt …</p>;

  function sitzplatzBezeichnung(fahrzeugId: number | null, sitzplatzId: string | null): string {
    if (fahrzeugId == null || sitzplatzId == null) return "";
    const fahrzeug = fahrzeuge.find((f) => f.id === fahrzeugId);
    const sitz = fahrzeug?.sitzplaetze.find((s) => s.id === sitzplatzId);
    return sitz?.bezeichnung ?? "";
  }

  return (
    <div>
      <p>
        <Link to="/moderator/listen">← Zurück zu den Listen</Link>
      </p>
      <h1>{einsatz.titel}</h1>
      <p style={{ color: "#666" }}>
        {new Date(einsatz.zeitpunkt).toLocaleString("de-DE")} · {einsatz.quelle} · {einsatz.status}
        {einsatz.archiviert ? " · archiviert" : ""}
      </p>
      <p>
        <a href={einsatzPdfUrl(einsatz.id)} target="_blank" rel="noreferrer">
          Als PDF exportieren
        </a>
      </p>

      {felder.length > 0 && (
        <div className="karte">
          <h2>Einsatzdetails</h2>
          <table>
            <tbody>
              {felder.map((f) => {
                const wert = einsatz.zusatzfelder[f.schluessel];
                if (wert === undefined || wert === "" || wert === false) {
                  return (
                    <tr key={f.schluessel}>
                      <td>
                        <strong>{f.label}</strong>
                      </td>
                      <td style={{ color: "#999" }}>–</td>
                    </tr>
                  );
                }
                return (
                  <tr key={f.schluessel}>
                    <td>
                      <strong>{f.label}</strong>
                    </td>
                    <td>{f.typ === "checkbox" ? "Ja" : String(wert)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <h2>Teilnehmer ({einsatz.teilnahmen.length})</h2>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Fahrzeug</th>
            <th>Sitzplatz</th>
            <th>Funktion</th>
            <th>VAB</th>
            <th>Atemschutz (min)</th>
            <th>Nur Gerätehaus</th>
            <th>Auf Anfahrt</th>
            <th>Bemerkung</th>
          </tr>
        </thead>
        <tbody>
          {einsatz.teilnahmen.length === 0 && (
            <tr>
              <td colSpan={9} style={{ color: "#999" }}>
                Keine Teilnehmer eingetragen.
              </td>
            </tr>
          )}
          {einsatz.teilnahmen.map((t) => (
            <tr key={t.id}>
              <td>{t.person_name}</td>
              <td>{t.fahrzeug_name ?? ""}</td>
              <td>{sitzplatzBezeichnung(t.fahrzeug_id, t.sitzplatz_id)}</td>
              <td>{t.funktion_name ?? ""}</td>
              <td>{t.vab ? "Ja" : ""}</td>
              <td>{t.atemschutzminuten || ""}</td>
              <td>{t.nur_geraetehaus ? "Ja" : ""}</td>
              <td>{t.auf_anfahrt ? "Ja" : ""}</td>
              <td>{t.bemerkung ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
