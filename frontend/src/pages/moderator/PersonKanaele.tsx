import { useEffect, useState } from "react";
import {
  holeKanalTypen,
  holePersonKanaele,
  setzePersonKanal,
  holeEreignisTypen,
  holePersonAbos,
  setzePersonAbo,
  type KanalTyp,
  type EreignisTyp,
} from "../../api/personKanaele";
import { ApiError } from "../../api/client";

interface Wert {
  zielwert: string;
  aktiv: boolean;
}

/** Benachrichtigungskanäle einer Person (Admin-Menü, in der Personal-Detailseite).
 * Selbstständige Komponente – lädt Registry + gespeicherte Kanäle für personId. */
export function PersonKanaele({ personId }: { personId: number }) {
  const [typen, setTypen] = useState<KanalTyp[]>([]);
  const [werte, setWerte] = useState<Record<string, Wert>>({});
  const [ereignisTypen, setEreignisTypen] = useState<EreignisTyp[]>([]);
  const [abos, setAbos] = useState<Set<string>>(new Set());
  const [hinweis, setHinweis] = useState<string | null>(null);

  useEffect(() => {
    let abbruch = false;
    Promise.all([
      holeKanalTypen(),
      holePersonKanaele(personId),
      holeEreignisTypen(),
      holePersonAbos(personId),
    ])
      .then(([typenR, kanaeleR, ereignisR, abosR]) => {
        if (abbruch) return;
        setTypen(typenR);
        const map: Record<string, Wert> = {};
        for (const t of typenR) map[t.key] = { zielwert: "", aktiv: true };
        for (const k of kanaeleR) map[k.typ] = { zielwert: k.zielwert, aktiv: k.aktiv };
        setWerte(map);
        setEreignisTypen(ereignisR);
        setAbos(new Set(abosR));
      })
      .catch(() => {});
    return () => {
      abbruch = true;
    };
  }, [personId]);

  async function aboUmschalten(ereignis: string, aktiv: boolean) {
    setAbos((alt) => {
      const neu = new Set(alt);
      if (aktiv) neu.add(ereignis);
      else neu.delete(ereignis);
      return neu;
    });
    try {
      await setzePersonAbo(personId, ereignis, aktiv);
    } catch (err) {
      setHinweis(err instanceof ApiError ? String(err.detail) : "Abo konnte nicht gesetzt werden.");
    }
  }

  async function speichern(typ: string) {
    const w = werte[typ] ?? { zielwert: "", aktiv: true };
    try {
      await setzePersonKanal(personId, typ, w.zielwert, w.aktiv);
      setHinweis("Gespeichert.");
      setTimeout(() => setHinweis(null), 1500);
    } catch (err) {
      setHinweis(err instanceof ApiError ? String(err.detail) : "Speichern fehlgeschlagen.");
    }
  }

  return (
    <div>
      <h3>Benachrichtigungskanäle</h3>
      {typen.map((t) => {
        const w = werte[t.key] ?? { zielwert: "", aktiv: true };
        return (
          <div
            key={t.key}
            style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}
          >
            <span style={{ minWidth: 90 }}>{t.label}</span>
            <input
              placeholder={t.zielwert_label}
              value={w.zielwert}
              onChange={(e) =>
                setWerte((m) => ({ ...m, [t.key]: { ...w, zielwert: e.target.value } }))
              }
              style={{ width: 200 }}
            />
            <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <input
                type="checkbox"
                checked={w.aktiv}
                onChange={(e) =>
                  setWerte((m) => ({ ...m, [t.key]: { ...w, aktiv: e.target.checked } }))
                }
              />
              aktiv
            </label>
            <button type="button" className="sekundaer" onClick={() => speichern(t.key)}>
              Speichern
            </button>
          </div>
        );
      })}
      <h3>Welche Benachrichtigungen?</h3>
      <p style={{ color: "var(--farbe-text-mute)", fontSize: "0.85rem", marginTop: 0 }}>
        Nur abonnierte Ereignisse werden über die aktiven Kanäle oben zugestellt.
      </p>
      {ereignisTypen.map((e) => (
        <label key={e.key} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
          <input
            type="checkbox"
            checked={abos.has(e.key)}
            onChange={(ev) => aboUmschalten(e.key, ev.target.checked)}
          />
          {e.label}
        </label>
      ))}

      {hinweis && (
        <p style={{ color: "var(--farbe-text-mute)", fontSize: "0.85rem" }}>{hinweis}</p>
      )}
    </div>
  );
}
