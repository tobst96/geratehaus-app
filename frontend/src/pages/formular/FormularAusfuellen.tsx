import { Fehlertext } from "../../components/Fehlertext";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiError } from "../../api/client";
import { Ladeanzeige } from "../../components/Ladeanzeige";
import { FormularZusammenfassung } from "../moderator/FormularZusammenfassung";
import {
  formularDateiHochladen,
  formularEinreichen,
  holeOeffentlichesErgebnis,
  holeOeffentlichesFormular,
  type FormularFeld,
  type FormularOeffentlich,
  type Zusammenfassung,
} from "../../api/formular";

const marker = (id: string) => `formular_done_${id}`;

export function FormularAusfuellen() {
  const { id } = useParams<{ id: string }>();
  const [formular, setFormular] = useState<FormularOeffentlich | null>(null);
  const [werte, setWerte] = useState<Record<string, unknown>>({});
  const [feldFehler, setFeldFehler] = useState<Record<string, string>>({});
  const [fehler, setFehler] = useState<string | null>(null);
  const [gesendet, setGesendet] = useState(false);
  const [sendet, setSendet] = useState(false);
  const [einwilligung, setEinwilligung] = useState(false);
  const [hp, setHp] = useState("");
  const [ergebnis, setErgebnis] = useState<Zusammenfassung | null>(null);

  useEffect(() => {
    if (!id) return;
    holeOeffentlichesFormular(Number(id))
      .then((f) => {
        setFormular(f);
        if (localStorage.getItem(marker(id))) setGesendet(true);
      })
      .catch((err) =>
        setFehler(err instanceof ApiError ? String(err.detail) : "Formular konnte nicht geladen werden.")
      );
  }, [id]);

  // Öffentliches Ergebnis nach dem Absenden (bzw. bei bereits abgesendetem Formular) laden.
  useEffect(() => {
    if (gesendet && formular?.ergebnis_oeffentlich) {
      holeOeffentlichesErgebnis(formular.id).then(setErgebnis).catch(() => setErgebnis(null));
    }
  }, [gesendet, formular]);

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

  async function dateiWaehlen(feld: FormularFeld, datei: File | undefined) {
    if (!datei || !formular) return;
    try {
      const { referenz } = await formularDateiHochladen(formular.id, datei);
      setWert(feld, referenz);
    } catch (err) {
      setFeldFehler((f) => ({
        ...f,
        [String(feld.id)]: err instanceof ApiError ? String(err.detail) : "Upload fehlgeschlagen.",
      }));
    }
  }

  async function absenden() {
    if (!formular) return;
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
    if (formular.einwilligung_text && !einwilligung) {
      setFehler("Bitte bestätige die Einwilligung.");
      return;
    }
    if (Object.keys(fehlend).length > 0) {
      setFeldFehler(fehlend);
      return;
    }

    setSendet(true);
    setFehler(null);
    try {
      await formularEinreichen(formular.id, werte, { einwilligung, hp });
      if (id) localStorage.setItem(marker(id), "1");
      setGesendet(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 422 && err.detail && typeof err.detail === "object") {
        const detail = err.detail as { felder?: Record<string, string> };
        if (detail.felder) setFeldFehler(detail.felder);
        else setFehler(String((err.detail as { detail?: string }).detail ?? "Bitte Eingaben prüfen."));
      } else if (err instanceof ApiError && err.status === 401) {
        setFehler("Für dieses Formular ist eine Anmeldung erforderlich. Bitte zuerst anmelden.");
      } else if (err instanceof ApiError && err.status === 409) {
        setFehler(String(err.detail));
      } else {
        setFehler(err instanceof ApiError ? String(err.detail) : "Absenden fehlgeschlagen.");
      }
    } finally {
      setSendet(false);
    }
  }

  if (fehler && !formular)
    return <Fehlertext style={{ maxWidth: 640, margin: "24px auto" }}>{fehler}</Fehlertext>;
  if (!formular) return <Ladeanzeige />;

  if (gesendet) {
    return (
      <div style={{ maxWidth: 640, margin: "24px auto", padding: "0 16px" }}>
        <div className="karte text-center">
          <h2>Vielen Dank!</h2>
          <p>{formular.danke_text || "Deine Einreichung wurde gespeichert."}</p>
          <Link to="/formulare">← Zu den Formularen</Link>
        </div>
        {ergebnis && (
          <div className="karte">
            <h2>Ergebnis</h2>
            <FormularZusammenfassung daten={ergebnis} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640, margin: "24px auto", padding: "0 16px" }}>
      <p>
        <Link to="/formulare">← Zu den Formularen</Link>
      </p>
      <h1>{formular.name}</h1>
      {formular.beschreibung && <p className="text-mute">{formular.beschreibung}</p>}
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
            {feld.typ === "zahl" && (
              <input
                type="number"
                value={(werte[feld.id] as string) ?? ""}
                onChange={(e) => setWert(feld, e.target.value)}
              />
            )}
            {feld.typ === "datum" && (
              <input
                type="date"
                value={(werte[feld.id] as string) ?? ""}
                onChange={(e) => setWert(feld, e.target.value)}
              />
            )}
            {feld.typ === "email" && (
              <input
                type="email"
                value={(werte[feld.id] as string) ?? ""}
                onChange={(e) => setWert(feld, e.target.value)}
              />
            )}
            {feld.typ === "telefon" && (
              <input
                type="tel"
                value={(werte[feld.id] as string) ?? ""}
                onChange={(e) => setWert(feld, e.target.value)}
              />
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
            {feld.typ === "ja_nein" && (
              <div style={{ display: "flex", gap: 16 }}>
                {["Ja", "Nein"].map((opt) => (
                  <label key={opt} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input
                      type="radio"
                      name={`feld-${feld.id}`}
                      checked={werte[feld.id] === opt}
                      onChange={() => setWert(feld, opt)}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            )}
            {(feld.typ === "sterne" || feld.typ === "skala") && (
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }} role="group" aria-label={feld.label}>
                {Array.from({ length: feld.max_sterne }, (_, i) => i + 1).map((n) => {
                  const aktiv = (werte[feld.id] as number) >= n;
                  const ausgewaehlt = (werte[feld.id] as number) === n;
                  return (
                    <button
                      type="button"
                      key={n}
                      onClick={() => setWert(feld, n)}
                      aria-pressed={ausgewaehlt}
                      aria-label={
                        feld.typ === "sterne"
                          ? `${n} von ${feld.max_sterne} Sternen`
                          : `Wert ${n} von ${feld.max_sterne}`
                      }
                      style={
                        feld.typ === "sterne"
                          ? {
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              fontSize: "1.6rem",
                              lineHeight: 1,
                              color: aktiv ? "#e0a500" : "var(--farbe-rand)",
                              padding: 0,
                            }
                          : {
                              cursor: "pointer",
                              minWidth: 36,
                              padding: "6px 10px",
                              borderRadius: 6,
                              border: "1px solid var(--farbe-rand)",
                              background: werte[feld.id] === n ? "var(--farbe-primaer)" : "transparent",
                              color: werte[feld.id] === n ? "#fff" : "inherit",
                            }
                      }
                    >
                      {feld.typ === "sterne" ? "★" : n}
                    </button>
                  );
                })}
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
            {feld.typ === "datei" && (
              <div>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,application/pdf"
                  onChange={(e) => dateiWaehlen(feld, e.target.files?.[0])}
                />
                {typeof werte[feld.id] === "string" && (
                  <p style={{ color: "var(--farbe-text-mute)", fontSize: "0.85rem", margin: "4px 0 0" }}>
                    ✓ Datei hochgeladen
                  </p>
                )}
              </div>
            )}

            {feld.hinweis && (
              <p style={{ color: "var(--farbe-text-mute)", fontSize: "0.85rem", margin: "4px 0 0" }}>
                {feld.hinweis}
              </p>
            )}
            {feldFehler[String(feld.id)] && (
              <Fehlertext style={{ margin: "4px 0 0" }}>
                {feldFehler[String(feld.id)]}
              </Fehlertext>
            )}
          </div>
        ))}

        {/* Honeypot: für Menschen unsichtbar, nur Bots füllen es aus. */}
        <input
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={hp}
          onChange={(e) => setHp(e.target.value)}
          style={{ position: "absolute", left: "-5000px", width: 1, height: 1, opacity: 0 }}
          aria-hidden="true"
        />

        {formular.einwilligung_text && (
          <label style={{ display: "flex", alignItems: "flex-start", gap: 8, marginTop: 8 }}>
            <input type="checkbox" checked={einwilligung} onChange={(e) => setEinwilligung(e.target.checked)} />
            <span>{formular.einwilligung_text}</span>
          </label>
        )}

        {fehler && <Fehlertext>{fehler}</Fehlertext>}
        <button onClick={absenden} disabled={sendet}>
          {sendet ? "Sendet …" : "Absenden"}
        </button>
      </div>
    </div>
  );
}
