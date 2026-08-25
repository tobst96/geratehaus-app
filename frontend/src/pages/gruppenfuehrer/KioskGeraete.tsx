import { Fehlertext } from "../../components/Fehlertext";
import { useEffect, useState, type FormEvent } from "react";
import {
  holeKioskTokens,
  kioskTokenAnlegen,
  kioskTokenLoeschen,
  ladeKioskPdf,
  schreibeEinstellungen,
  setzeKioskStartseiteModule,
  type KioskTokenOut,
} from "../../api/gruppenfuehrer";
import { ApiError } from "../../api/client";
import { useConfig } from "../../context/ConfigContext";
import { oeffentlicheBasisUrl } from "../../utils/oeffentlicheUrl";
import { Ladeanzeige } from "../../components/Ladeanzeige";
import { texte } from "../../i18n/texte";

const t = texte.kiosk_geraete;

// Module, die als Kachel auf der Kiosk-Startseite erscheinen können.
const STARTSEITE_MODULE: { key: string; label: string }[] = [
  { key: "einsatztagebuch", label: t.module_labels.einsatztagebuch },
  { key: "dienstbuch", label: t.module_labels.dienstbuch },
  { key: "dienststunden", label: t.module_labels.dienststunden },
  { key: "fahrzeugbuchung", label: t.module_labels.fahrzeugbuchung },
];

export function KioskGeraete() {
  const { config, neuLaden } = useConfig();
  const [geraete, setGeraete] = useState<KioskTokenOut[] | null>(null);
  const [bezeichnung, setBezeichnung] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);
  const [autolock, setAutolock] = useState<number>(config?.kiosk_autolock_sekunden ?? 0);
  const [autolockGespeichert, setAutolockGespeichert] = useState(false);

  async function autolockSpeichern() {
    try {
      await schreibeEinstellungen({ kiosk_autolock_sekunden: autolock });
      await neuLaden();
      setAutolockGespeichert(true);
      setTimeout(() => setAutolockGespeichert(false), 2000);
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : t.fehler_speichern);
    }
  }

  async function laden() {
    try {
      setGeraete(await holeKioskTokens());
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : t.fehler_laden);
    }
  }

  useEffect(() => {
    laden();
  }, []);

  async function anlegen(e: FormEvent) {
    e.preventDefault();
    if (!bezeichnung.trim()) return;
    try {
      await kioskTokenAnlegen(bezeichnung.trim());
      setBezeichnung("");
      await laden();
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : t.fehler_anlegen);
    }
  }

  async function loeschen(id: number) {
    if (!confirm(t.loeschen_bestaetigen)) return;
    try {
      await kioskTokenLoeschen(id);
      await laden();
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : t.fehler_loeschen);
    }
  }

  function linkFuer(token: string): string {
    return `${oeffentlicheBasisUrl(config)}/kiosk/${token}`;
  }

  async function kopieren(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      window.prompt(t.link_manuell_kopieren, text);
    }
  }

  // Global aktivierte Startseiten-Module (Fallback, wenn ein Kiosk keine eigene
  // Auswahl hat).
  function globalDefaults(): string[] {
    const c = config as Record<string, unknown> | null;
    return STARTSEITE_MODULE.filter((m) => c?.[`modul_${m.key}_startseite`]).map((m) => m.key);
  }

  async function moduleSetzen(id: number, keys: string[] | null) {
    try {
      await setzeKioskStartseiteModule(id, keys);
      await laden();
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : t.fehler_speichern);
    }
  }

  function toggleModul(g: KioskTokenOut, key: string) {
    const aktuell = g.startseite_module ?? globalDefaults();
    const neu = aktuell.includes(key) ? aktuell.filter((k) => k !== key) : [...aktuell, key];
    moduleSetzen(g.id, neu);
  }

  if (fehler) return <Fehlertext>{fehler}</Fehlertext>;
  if (!geraete) return <Ladeanzeige />;

  return (
    <div>
      <h1>{t.titel}</h1>
      <p className="text-mute">{t.intro}</p>

      <div className="karte">
        <h2 style={{ marginTop: 0 }}>{t.autolock_titel}</h2>
        <p style={{ color: "var(--farbe-text-mute)", fontSize: "0.9rem" }}>{t.autolock_hinweis}</p>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <label htmlFor="kiosk-autolock">{t.autolock_label}</label>
          <input
            id="kiosk-autolock"
            type="number"
            min={0}
            value={autolock}
            onChange={(e) => setAutolock(Math.max(0, Number(e.target.value)))}
            style={{ width: 120 }}
          />
          <button type="button" onClick={autolockSpeichern}>
            {t.speichern}
          </button>
          {autolockGespeichert && <span style={{ color: "green" }}>{t.gespeichert}</span>}
        </div>
      </div>

      <form onSubmit={anlegen} className="karte" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          placeholder={t.bezeichnung_platzhalter}
          value={bezeichnung}
          onChange={(e) => setBezeichnung(e.target.value)}
          style={{ flex: 1, minWidth: 200 }}
        />
        <button type="submit">{t.anlegen}</button>
      </form>

      {geraete.length === 0 && <p>{t.keine_geraete}</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {geraete.map((g) => {
          const individuell = g.startseite_module !== null;
          const sichtbar = g.startseite_module ?? globalDefaults();
          return (
            <div key={g.id} className="karte" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <strong className="flex-1">{g.bezeichnung}</strong>
                <input readOnly value={linkFuer(g.token)} style={{ width: 360, fontSize: "0.8rem" }} />
                <button type="button" className="sekundaer" onClick={() => kopieren(linkFuer(g.token))}>
                  {t.kopieren}
                </button>
                <button type="button" className="sekundaer" onClick={() => ladeKioskPdf(g.id, g.bezeichnung)}>
                  {t.pdf}
                </button>
                <button type="button" className="sekundaer" onClick={() => loeschen(g.id)}>
                  {t.loeschen}
                </button>
              </div>

              <div>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={individuell}
                    onChange={(e) => moduleSetzen(g.id, e.target.checked ? globalDefaults() : null)}
                  />
                  {t.individuell_label}
                </label>
                <p style={{ color: "var(--farbe-text-mute)", fontSize: "0.85rem", margin: "4px 0 8px" }}>
                  {individuell ? t.individuell_hinweis_an : t.individuell_hinweis_aus}
                </p>
                {individuell && (
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                    {STARTSEITE_MODULE.map((m) => (
                      <label key={m.key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <input
                          type="checkbox"
                          checked={sichtbar.includes(m.key)}
                          onChange={() => toggleModul(g, m.key)}
                        />
                        {m.label}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
