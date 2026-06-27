import { useEffect, useState, type FormEvent } from "react";
import { holeKioskTokens, kioskTokenAnlegen, kioskTokenLoeschen, type KioskTokenOut } from "../../api/moderator";
import { ApiError } from "../../api/client";
import { useConfig } from "../../context/ConfigContext";
import { oeffentlicheBasisUrl } from "../../utils/oeffentlicheUrl";
import { Ladeanzeige } from "../../components/Ladeanzeige";

export function KioskGeraete() {
  const { config } = useConfig();
  const [geraete, setGeraete] = useState<KioskTokenOut[] | null>(null);
  const [bezeichnung, setBezeichnung] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);

  async function laden() {
    try {
      setGeraete(await holeKioskTokens());
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Kiosk-Geräte konnten nicht geladen werden.");
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
      setFehler(err instanceof ApiError ? String(err.detail) : "Anlegen fehlgeschlagen.");
    }
  }

  async function loeschen(id: number) {
    if (!confirm("Diesen Kiosk-Link wirklich löschen? Das Tablet kann sich danach nicht mehr aufrufen.")) return;
    try {
      await kioskTokenLoeschen(id);
      await laden();
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Löschen fehlgeschlagen.");
    }
  }

  function linkFuer(token: string): string {
    return `${oeffentlicheBasisUrl(config)}/kiosk/${token}`;
  }

  async function kopieren(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      window.prompt("Link manuell kopieren:", text);
    }
  }

  if (fehler) return <p className="fehlertext">{fehler}</p>;
  if (!geraete) return <Ladeanzeige />;

  return (
    <div>
      <h1>Kiosk-Geräte</h1>
      <p style={{ color: "var(--farbe-text-mute)" }}>
        Jedes Tablet im Gerätehaus braucht einen eigenen Link. Diesen Link einmalig als Lesezeichen /
        Startbildschirm-Symbol auf dem jeweiligen Tablet hinterlegen.
      </p>

      <form onSubmit={anlegen} className="karte" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          placeholder="Bezeichnung (z. B. Tablet Garage)"
          value={bezeichnung}
          onChange={(e) => setBezeichnung(e.target.value)}
          style={{ flex: 1, minWidth: 200 }}
        />
        <button type="submit">Anlegen</button>
      </form>

      {geraete.length === 0 && <p>Noch keine Kiosk-Geräte angelegt.</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {geraete.map((g) => (
          <div key={g.id} className="karte" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <strong style={{ flex: 1 }}>{g.bezeichnung}</strong>
            <input readOnly value={linkFuer(g.token)} style={{ width: 360, fontSize: "0.8rem" }} />
            <button type="button" className="sekundaer" onClick={() => kopieren(linkFuer(g.token))}>
              Kopieren
            </button>
            <button type="button" className="sekundaer" onClick={() => loeschen(g.id)}>
              Löschen
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
