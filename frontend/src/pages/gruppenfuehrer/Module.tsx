import { Fehlertext } from "../../components/Fehlertext";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  holeFeatureModule,
  setFeatureModulFlag,
  setFeatureModulReihenfolge,
  type FeatureModul,
} from "../../api/featureModule";
import { ApiError } from "../../api/client";
import { holeMeta } from "../../api/meta";
import { Ladeanzeige } from "../../components/Ladeanzeige";

export function Module() {
  const [module, setModule] = useState<FeatureModul[] | null>(null);
  const [docsBasis, setDocsBasis] = useState<string | null>(null);
  const [suche, setSuche] = useState("");
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
    holeMeta()
      .then((m) => setDocsBasis(m.docs_basis_url))
      .catch(() => setDocsBasis(null));
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

  // Verschiebt ein Modul innerhalb SEINER Gruppe (intern/mitgliederseitig); die
  // globale Reihenfolge bleibt dabei gültig (es werden zwei Module derselben Gruppe
  // getauscht).
  async function verschiebeInGruppe(m: FeatureModul, gruppe: FeatureModul[], richtung: -1 | 1) {
    if (!module) return;
    const gi = gruppe.findIndex((x) => x.key === m.key);
    const nachbar = gruppe[gi + richtung];
    if (!nachbar) return;
    const neu = [...module];
    const a = neu.findIndex((x) => x.key === m.key);
    const b = neu.findIndex((x) => x.key === nachbar.key);
    [neu[a], neu[b]] = [neu[b], neu[a]];
    setBusy(true);
    setFehler(null);
    try {
      setModule(await setFeatureModulReihenfolge(neu.map((x) => x.key)));
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Reihenfolge konnte nicht gespeichert werden.");
    } finally {
      setBusy(false);
    }
  }

  if (fehler && !module) return <Fehlertext>{fehler}</Fehlertext>;
  if (!module) return <Ladeanzeige />;

  return (
    <div>
      <h1>Module</h1>
      <p className="text-mute">
        Module ein-/ausschalten und sortieren. <strong>Auf den Modulnamen klicken</strong>, um die
        Einstellungen des Moduls (Unterseite) zu öffnen. Die Reihenfolge gilt für die Kiosk-Kacheln
        und die Navigation. Deaktivierte Module verschwinden aus der Navigation.
      </p>
      {fehler && <Fehlertext>{fehler}</Fehlertext>}

      <input
        type="text"
        placeholder="Modul suchen…"
        value={suche}
        onChange={(e) => setSuche(e.target.value)}
        autoFocus
        style={{ maxWidth: 640, marginBottom: 16 }}
      />

      {(() => {
        const begriff = suche.trim().toLowerCase();
        const passt = (m: FeatureModul) =>
          begriff === "" || m.name.toLowerCase().includes(begriff) || m.key.toLowerCase().includes(begriff);
        const gruppen = [
          { titel: "Interne Module", hinweis: "Verwaltung & Technik – nicht für Mitglieder sichtbar.", liste: module!.filter((m) => !m.mitgliederseitig) },
          { titel: "Mitglieder-Module", hinweis: "Erscheinen als Kacheln am Kiosk / im Mitglieder-Login.", liste: module!.filter((m) => m.mitgliederseitig) },
        ];
        const gesamtTreffer = gruppen.reduce((n, g) => n + g.liste.filter(passt).length, 0);
        if (begriff !== "" && gesamtTreffer === 0) {
          return <p className="text-mute">Keine Module gefunden.</p>;
        }
        return gruppen.map((gruppe) => {
          const treffer = gruppe.liste.filter(passt);
          if (treffer.length === 0) return null;
          return (
        <div key={gruppe.titel} style={{ marginBottom: 20 }}>
          <h2 style={{ marginBottom: 2 }}>{gruppe.titel}</h2>
          <p style={{ color: "var(--farbe-text-mute)", fontSize: "0.85rem", marginTop: 0 }}>{gruppe.hinweis}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 640 }}>
            {treffer.map((m) => {
              const gi = gruppe.liste.indexOf(m);
              return (
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
                disabled={busy || begriff !== "" || gi === 0}
                onClick={() => verschiebeInGruppe(m, gruppe.liste, -1)}
                style={{ padding: "2px 8px", lineHeight: 1 }}
              >
                ▲
              </button>
              <button
                type="button"
                className="sekundaer"
                aria-label="Nach unten"
                disabled={busy || begriff !== "" || gi === gruppe.liste.length - 1}
                onClick={() => verschiebeInGruppe(m, gruppe.liste, 1)}
                style={{ padding: "2px 8px", lineHeight: 1 }}
              >
                ▼
              </button>
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <Link
                  to={`/gruppenfuehrer/module/${m.key}`}
                  style={{
                    fontWeight: 700,
                    color: "var(--farbe-primaer)",
                    textDecoration: "none",
                  }}
                  title="Einstellungen dieses Moduls öffnen"
                >
                  {m.name} →
                </Link>
                {docsBasis && (
                  <a
                    href={`${docsBasis}/${m.key}.md`}
                    target="_blank"
                    rel="noreferrer"
                    className="hinweistext"
                    title="Dokumentation dieses Moduls auf GitHub öffnen (passend zur installierten Version)"
                  >
                    📖 Doku ↗
                  </a>
                )}
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
                  <span className="hinweistext">
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
              );
            })}
          </div>
        </div>
          );
        });
      })()}
    </div>
  );
}
