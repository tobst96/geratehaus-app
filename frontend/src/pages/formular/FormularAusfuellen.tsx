import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiError } from "../../api/client";
import { Ladeanzeige } from "../../components/Ladeanzeige";
import {
  formularEinreichen,
  holeOeffentlichesFormular,
  type FormularFeld,
  type FormularOeffentlich,
} from "../../api/formular";

export function FormularAusfuellen() {
  const { id } = useParams<{ id: string }>();
  const [formular, setFormular] = useState<FormularOeffentlich | null>(null);
  const [werte, setWerte] = useState<Record<string, unknown>>({});
  const [feldFehler, setFeldFehler] = useState<Record<string, string>>({});
  const [fehler, setFehler] = useState<string | null>(null);
  const [gesendet, setGesendet] = useState(false);
  const [sendet, setSendet] = useState(false);

  useEffect(() => {
    if (!id) return;
    holeOeffentlichesFormular(Number(id))
      .then(setFormular)
      .catch((err) =>
        setFehler(err instanceof ApiError ? String(err.detail) : "Formular konnte nicht geladen werden.")
      );
  }, [id]);

  function setWert(feld: FormularFeld, wert: unknown) {
    setWerte((v) => ({ ...v, [feld.id]: wert }));
    setFeldFehler((f) => {
      const rest = { ...f };
      delete rest[String(feld.id)];
      return rest;
    });
  }

  function mehrfachUmschalten(feld: FormularFeld, option: string, an: boolean) {
    const aktuell = Array.isArray(werte[feld.id]) ? (werte[feld.id] as string[]) : [];
    setWert(feld, an ? [...aktuell, option] : aktuell.filter((x) => x !== option));
  }

  async function absenden() {
    if (!formular) return;
    // Clientseitige Pflichtfeldprüfung (der Server prüft zusätzlich).
    const fehlend: Record<string, string> = {};
    for (const feld of formular.felder) {
      if (!feld.pflicht) continue;
      const w = werte[feld.id];
      const leer =
        w === undefined ||
        w === null ||
        (typeof w === "string" && w.trim() === "") ||
        (Array.isArray(w) && w.length === 0) ||
        (feld.typ === "checkbox" && w !== true);
      if (leer) fehlend[String(feld.id)] = "Dieses Feld muss ausgefüllt werden.";
    }
    if (Object.keys(fehlend).length > 0) {
      setFeldFehler(fehlend);
      return;
    }

    setSendet(true);
    setFehler(null);
    try {
      await formularEinreichen(formular.id, werte);
      setGesendet(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 422 && err.detail && typeof err.detail === "object") {
        const detail = err.detail as { felder?: Record<string, string> };
        if (detail.felder) setFeldFehler(detail.felder);
      } else if (err instanceof ApiError && err.status === 401) {
        setFehler("Für dieses Formular ist eine Anmeldung erforderlich. Bitte zuerst anmelden.");
      } else {
        setFehler(err instanceof ApiError ? String(err.detail) : "Absenden fehlgeschlagen.");
      }
    } finally {
      setSendet(false);
    }
  }

  if (fehler && !formular)
    return <p className="fehlertext" style={{ maxWidth: 640, margin: "24px auto" }}>{fehler}</p>;
  if (!formular) return <Ladeanzeige />;

  if (gesendet) {
    return (
      <div style={{ maxWidth: 640, margin: "24px auto", padding: "0 16px" }}>
        <div className="karte" style={{ textAlign: "center" }}>
          <h2>Vielen Dank!</h2>
          <p>Deine Einreichung wurde gespeichert.</p>
          <Link to="/formulare">← Zu den Formularen</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640, margin: "24px auto", padding: "0 16px" }}>
      <p>
        <Link to="/formulare">← Zu den Formularen</Link>
      </p>
      <h1>{formular.name}</h1>
      {formular.beschreibung && <p style={{ color: "var(--farbe-text-mute)" }}>{formular.beschreibung}</p>}
      {formular.login_erforderlich && (
        <p style={{ color: "var(--farbe-text-mute)", fontSize: "0.9rem" }}>
          🔒 Zum Absenden ist eine Anmeldung erforderlich.{" "}
          <Link to="/mitglied/login">Jetzt anmelden</Link>
        </p>
      )}

      <div className="karte">
        {formular.felder.map((feld) => (
          <div key={feld.id} className="formular-feld">
            <label>
              {feld.label}
              {feld.pflicht && <span style={{ color: "#d64545" }}> *</span>}
            </label>

            {feld.typ === "text" && (
              <input value={(werte[feld.id] as string) ?? ""} onChange={(e) => setWert(feld, e.target.value)} />
            )}
            {feld.typ === "mehrzeilig" && (
              <textarea value={(werte[feld.id] as string) ?? ""} onChange={(e) => setWert(feld, e.target.value)} />
            )}
            {feld.typ === "checkbox" && (
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={werte[feld.id] === true}
                  onChange={(e) => setWert(feld, e.target.checked)}
                />
                Ja
              </label>
            )}
            {feld.typ === "sterne" && (
              <div style={{ display: "flex", gap: 4 }}>
                {Array.from({ length: feld.max_sterne }, (_, i) => i + 1).map((n) => (
                  <button
                    type="button"
                    key={n}
                    onClick={() => setWert(feld, n)}
                    aria-label={`${n} Sterne`}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "1.6rem",
                      lineHeight: 1,
                      color: (werte[feld.id] as number) >= n ? "#e0a500" : "var(--farbe-rand)",
                      padding: 0,
                    }}
                  >
                    ★
                  </button>
                ))}
              </div>
            )}
            {feld.typ === "dropdown" && (
              <select value={(werte[feld.id] as string) ?? ""} onChange={(e) => setWert(feld, e.target.value)}>
                <option value="">– bitte wählen –</option>
                {feld.optionen.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            )}
            {feld.typ === "dropdown_mehrfach" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {feld.optionen.map((o) => {
                  const aktuell = Array.isArray(werte[feld.id]) ? (werte[feld.id] as string[]) : [];
                  return (
                    <label key={o} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={aktuell.includes(o)}
                        onChange={(e) => mehrfachUmschalten(feld, o, e.target.checked)}
                      />
                      {o}
                    </label>
                  );
                })}
              </div>
            )}

            {feldFehler[String(feld.id)] && (
              <p className="fehlertext" style={{ margin: "4px 0 0" }}>
                {feldFehler[String(feld.id)]}
              </p>
            )}
          </div>
        ))}

        {fehler && <p className="fehlertext">{fehler}</p>}
        <button onClick={absenden} disabled={sendet}>
          {sendet ? "Sendet …" : "Absenden"}
        </button>
      </div>
    </div>
  );
}
