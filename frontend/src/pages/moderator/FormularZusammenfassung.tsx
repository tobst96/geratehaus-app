import type { Zusammenfassung } from "../../api/formular";

/** Aggregierter Zwischenstand eines Formulars (Ø Sterne, Verteilung je Option,
 * Freitext-Antworten). Wird im Admin-Modul und im Moderator-Listen-Tab genutzt. */
export function FormularZusammenfassung({ daten }: { daten: Zusammenfassung }) {
  return (
    <div>
      <p className="text-mute">
        {daten.anzahl_einreichungen} Einreichung{daten.anzahl_einreichungen === 1 ? "" : "en"}
      </p>
      {daten.felder.map((f) => (
        <div
          key={f.feld_id}
          style={{ border: "1px solid var(--farbe-rand)", borderRadius: 8, padding: 12, marginBottom: 8 }}
        >
          <strong>{f.label}</strong>
          {f.durchschnitt !== null && (
            <div style={{ marginTop: 4 }}>
              Durchschnitt: <strong>{f.durchschnitt}</strong>
              {f.typ === "sterne" ? " ★" : ""}
            </div>
          )}
          {f.verteilung && (
            <div style={{ marginTop: 4 }}>
              {Object.entries(f.verteilung).map(([k, v]) => (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ minWidth: 90 }}>{k}</span>
                  <span
                    style={{
                      display: "inline-block",
                      height: 10,
                      borderRadius: 4,
                      background: "var(--farbe-primaer)",
                      width: Math.max(4, v * 18),
                    }}
                  />
                  <span className="text-mute">{v}</span>
                </div>
              ))}
            </div>
          )}
          {f.texte && (
            <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
              {f.texte.length === 0 ? (
                <li style={{ color: "var(--farbe-text-mute)", listStyle: "none", marginLeft: -18 }}>
                  Keine Antworten.
                </li>
              ) : (
                f.texte.map((t, i) => <li key={i}>{t}</li>)
              )}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
