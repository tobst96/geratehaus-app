import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  holeFeatureModule,
  setFeatureModulFlag,
  setFeatureModulReihenfolge,
  type FeatureModul,
} from "../../api/featureModule";
import { ApiError } from "../../api/client";
import { Ladeanzeige } from "../../components/Ladeanzeige";

export function Module() {
  const [module, setModule] = useState<FeatureModul[] | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function laden() {
    try {
      setModule(await holeFeatureModule());
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Module konnten nicht geladen werden.");
    }
  }

  useEffect(() => {
    laden();
  }, []);

  async function flagSetzen(
    m: FeatureModul,
    feld: "aktiv" | "startseite" | "aussenzugriff",
    wert: boolean
  ) {
    setFehler(null);
    try {
      const aktualisiert = await setFeatureModulFlag(m.key, { [feld]: wert });
      setModule((liste) =>
        liste ? liste.map((x) => (x.key === aktualisiert.key ? aktualisiert : x)) : liste
      );
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Modul konnte nicht geändert werden.");
    }
  }

  async function verschieben(index: number, richtung: -1 | 1) {
    if (!module) return;
    const ziel = index + richtung;
    if (ziel < 0 || ziel >= module.length) return;
    const neu = [...module];
    [neu[index], neu[ziel]] = [neu[ziel], neu[index]];
    setBusy(true);
    setFehler(null);
    try {
      setModule(await setFeatureModulReihenfolge(neu.map((m) => m.key)));
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Reihenfolge konnte nicht gespeichert werden.");
    } finally {
      setBusy(false);
    }
  }

  if (fehler && !module) return <p className="fehlertext">{fehler}</p>;
  if (!module) return <Ladeanzeige />;

  return (
    <div>
      <h1>Module</h1>
      <p style={{ color: "var(--farbe-text-mute)" }}>
        Module ein-/ausschalten und sortieren. <strong>Auf den Modulnamen klicken</strong>, um die
        Einstellungen des Moduls (Unterseite) zu öffnen. Die Reihenfolge gilt für die Kiosk-Kacheln
        und die Navigation. Deaktivierte Module verschwinden aus der Navigation.
      </p>
      {fehler && <p className="fehlertext">{fehler}</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 640 }}>
        {module.map((m, i) => (
          <div
            key={m.key}
            className="karte"
            style={{ display: "flex", alignItems: "flex-start", gap: 12, opacity: m.aktiv ? 1 : 0.6 }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <button
                type="button"
                className="sekundaer"
                aria-label="Nach oben"
                disabled={busy || i === 0}
                onClick={() => verschieben(i, -1)}
                style={{ padding: "2px 8px", lineHeight: 1 }}
              >
                ▲
              </button>
              <button
                type="button"
                className="sekundaer"
                aria-label="Nach unten"
                disabled={busy || i === module.length - 1}
                onClick={() => verschieben(i, 1)}
                style={{ padding: "2px 8px", lineHeight: 1 }}
              >
                ▼
              </button>
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <Link
                  to={`/moderator/module/${m.key}`}
                  style={{
                    fontWeight: 700,
                    color: "var(--farbe-primaer)",
                    textDecoration: "none",
                  }}
                  title="Einstellungen dieses Moduls öffnen"
                >
                  {m.name} →
                </Link>
                {!m.mitgliederseitig && (
                  <span
                    style={{
                      fontSize: "0.7rem",
                      color: "var(--farbe-text-mute)",
                      border: "1px solid var(--farbe-rahmen, #ddd)",
                      borderRadius: 4,
                      padding: "1px 6px",
                    }}
                  >
                    intern
                  </span>
                )}
              </div>

              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 8 }}>
                {m.immer_aktiv ? (
                  <span style={{ color: "var(--farbe-text-mute)", fontSize: "0.85rem" }}>
                    immer aktiv
                  </span>
                ) : (
                  <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input
                      type="checkbox"
                      checked={m.aktiv}
                      onChange={(e) => flagSetzen(m, "aktiv", e.target.checked)}
                    />
                    Aktiv
                  </label>
                )}
                {m.mitgliederseitig && (
                  <>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        color: m.aktiv ? undefined : "var(--farbe-text-mute)",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(m.startseite)}
                        disabled={!m.aktiv}
                        onChange={(e) => flagSetzen(m, "startseite", e.target.checked)}
                      />
                      Auf Kiosk anzeigen
                    </label>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        color: m.aktiv ? undefined : "var(--farbe-text-mute)",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(m.aussenzugriff)}
                        disabled={!m.aktiv}
                        onChange={(e) => flagSetzen(m, "aussenzugriff", e.target.checked)}
                      />
                      Außenzugriff erlauben
                    </label>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
