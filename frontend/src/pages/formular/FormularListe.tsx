import { Fehlertext } from "../../components/Fehlertext";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError } from "../../api/client";
import { Ladeanzeige } from "../../components/Ladeanzeige";
import { holeOeffentlicheFormulare, type FormularOeffentlich } from "../../api/formular";

export function FormularListe() {
  const navigate = useNavigate();
  const [formulare, setFormulare] = useState<FormularOeffentlich[] | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);

  useEffect(() => {
    holeOeffentlicheFormulare()
      .then(setFormulare)
      .catch((err) =>
        setFehler(err instanceof ApiError ? String(err.detail) : "Formulare konnten nicht geladen werden.")
      );
  }, []);

  if (fehler) return <Fehlertext style={{ maxWidth: 640, margin: "24px auto" }}>{fehler}</Fehlertext>;
  if (!formulare) return <Ladeanzeige />;

  return (
    <div style={{ maxWidth: 640, margin: "24px auto", padding: "0 16px" }}>
      <h1>Formulare</h1>
      {formulare.length === 0 ? (
        <p className="text-mute">Aktuell sind keine Formulare verfügbar.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {formulare.map((f) => (
            <button
              key={f.id}
              className="karte"
              onClick={() => navigate(`/formular/${f.id}`)}
              style={{ textAlign: "left", cursor: "pointer" }}
            >
              <strong>{f.name}</strong>
              {f.beschreibung && (
                <div style={{ color: "var(--farbe-text-mute)", fontSize: "0.9rem", marginTop: 4 }}>
                  {f.beschreibung}
                </div>
              )}
              {f.login_erforderlich && (
                <div style={{ color: "var(--farbe-text-mute)", fontSize: "0.8rem", marginTop: 4 }}>
                  🔒 Anmeldung erforderlich
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
