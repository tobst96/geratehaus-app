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
import { texte } from "../../i18n/texte";

interface Wert {
  zielwert: string;
  aktiv: boolean;
}

/** Gruppiert die Ereignistypen nach Modul-Label (Reihenfolge = erstes Auftreten,
 * i. d. R. modulgebundene Module zuerst, „Allgemein" zuletzt). */
function gruppiereNachModul(typen: EreignisTyp[]): [string, EreignisTyp[]][] {
  const gruppen = new Map<string, EreignisTyp[]>();
  for (const t of typen) {
    const liste = gruppen.get(t.modul_label) ?? [];
    liste.push(t);
    gruppen.set(t.modul_label, liste);
  }
  return [...gruppen.entries()];
}

/** Benachrichtigungskanäle einer Person (Admin-Menü, in der Personal-Detailseite).
 * Selbstständige Komponente – lädt Registry + gespeicherte Kanäle für personId. */
export function PersonKanaele({ personId, personEmail }: { personId: number; personEmail?: string | null }) {
  const txt = texte.person_kanaele;
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
        for (const t of typenR) map[t.key] = { zielwert: "", aktiv: false };
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
      setHinweis(err instanceof ApiError ? String(err.detail) : txt.abo_fehler);
    }
  }

  async function speichern(typ: string) {
    const w = werte[typ] ?? { zielwert: "", aktiv: false };
    try {
      await setzePersonKanal(personId, typ, w.zielwert, w.aktiv);
      setHinweis(txt.gespeichert);
      setTimeout(() => setHinweis(null), 1500);
    } catch (err) {
      setHinweis(err instanceof ApiError ? String(err.detail) : txt.speichern_fehler);
    }
  }

  return (
    <div>
      <h3>{txt.kanaele_titel}</h3>
      {typen.map((t) => {
        const w = werte[t.key] ?? { zielwert: "", aktiv: false };
        return (
          <div
            key={t.key}
            style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}
          >
            <span style={{ minWidth: 90 }}>{t.label}</span>
            {t.key === "mail" ? (
              // Der Mail-Kanal nutzt die E-Mail-Adresse der Person – keine zweite
              // Adresse mehr pflegen.
              <span style={{ width: 200, color: "var(--farbe-text-mute)" }}>
                {personEmail?.trim() ? personEmail : txt.keine_email}
              </span>
            ) : (
              <input
                placeholder={t.zielwert_label}
                value={w.zielwert}
                onChange={(e) =>
                  setWerte((m) => ({ ...m, [t.key]: { ...w, zielwert: e.target.value } }))
                }
                style={{ width: 200 }}
              />
            )}
            <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <input
                type="checkbox"
                checked={w.aktiv}
                onChange={(e) =>
                  setWerte((m) => ({ ...m, [t.key]: { ...w, aktiv: e.target.checked } }))
                }
              />
              {txt.aktiv}
            </label>
            <button type="button" className="sekundaer" onClick={() => speichern(t.key)}>
              {txt.speichern}
            </button>
          </div>
        );
      })}
      <h3>{txt.welche_titel}</h3>
      <p style={{ color: "var(--farbe-text-mute)", fontSize: "0.85rem", marginTop: 0 }}>
{txt.welche_intro}
      </p>
      {gruppiereNachModul(ereignisTypen).map(([modulLabel, typen]) => (
        <div key={modulLabel} style={{ marginBottom: 10 }}>
          <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: 4 }}>{modulLabel}</div>
          {typen.map((e) => (
            <label
              key={e.key}
              style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, marginLeft: 8 }}
            >
              <input
                type="checkbox"
                checked={abos.has(e.key)}
                onChange={(ev) => aboUmschalten(e.key, ev.target.checked)}
              />
              {e.label}
            </label>
          ))}
        </div>
      ))}

      {hinweis && (
        <p className="hinweistext">{hinweis}</p>
      )}
    </div>
  );
}
