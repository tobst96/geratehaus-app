import { useEffect, useState, type FormEvent } from "react";
import { Fehlertext } from "../../components/Fehlertext";
import { Ladeanzeige } from "../../components/Ladeanzeige";
import { PlanerKalender } from "../../components/PlanerKalender";
import { PlanTerminDialog } from "../../components/PlanTerminDialog";
import { useAuth } from "../../context/AuthContext";
import { ApiError } from "../../api/client";
import {
  holeKategorien,
  holeTermine,
  holeUeberfaelligeVorlagen,
  legePlatzhalterAn,
  stelleJahrSicher,
} from "../../api/dienstbuchPlaner";
import type { PlanerKategorieOut, PlanTerminOut, VorlageUeberfaelligOut } from "../../api/types";

export function DienstbuchPlaner() {
  const { hatModulZugriff } = useAuth();
  const kannBearbeiten = hatModulZugriff("dienstbuch-planer-bearbeiten");

  const [jahr, setJahr] = useState(new Date().getFullYear());
  const [termine, setTermine] = useState<PlanTerminOut[] | null>(null);
  const [kategorien, setKategorien] = useState<PlanerKategorieOut[]>([]);
  const [ueberfaellig, setUeberfaellig] = useState<VorlageUeberfaelligOut[]>([]);
  const [fehler, setFehler] = useState<string | null>(null);
  const [ausgewaehlterTermin, setAusgewaehlterTermin] = useState<PlanTerminOut | null>(null);

  const [neuerPlatzhalterTitel, setNeuerPlatzhalterTitel] = useState("");

  async function laden() {
    try {
      const [t, k, u] = await Promise.all([
        holeTermine(jahr),
        holeKategorien(),
        holeUeberfaelligeVorlagen(),
      ]);
      setTermine(t);
      setKategorien(k);
      setUeberfaellig(u);
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Daten konnten nicht geladen werden.");
    }
  }

  useEffect(() => {
    laden();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jahr]);

  async function jahrSicherstellen() {
    await stelleJahrSicher(jahr);
    await laden();
  }

  async function platzhalterAnlegen(e: FormEvent) {
    e.preventDefault();
    if (!neuerPlatzhalterTitel.trim()) return;
    await legePlatzhalterAn({ titel: neuerPlatzhalterTitel.trim(), jahr });
    setNeuerPlatzhalterTitel("");
    await laden();
  }

  function terminGeaendert() {
    setAusgewaehlterTermin(null);
    laden();
  }

  if (fehler) return <Fehlertext>{fehler}</Fehlertext>;
  if (!termine) return <Ladeanzeige />;

  const platzhalter = termine.filter((t) => t.ist_platzhalter);
  const geplant = termine.filter((t) => !t.ist_platzhalter);

  return (
    <div>
      <h1>Dienstbuch Planer</h1>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <button className="sekundaer" onClick={() => setJahr((j) => j - 1)}>
          ← {jahr - 1}
        </button>
        <strong>{jahr}</strong>
        <button className="sekundaer" onClick={() => setJahr((j) => j + 1)}>
          {jahr + 1} →
        </button>
        {kannBearbeiten && (
          <button className="sekundaer" onClick={jahrSicherstellen} style={{ marginLeft: "auto" }}>
            Termine für {jahr} aus Vorlagen aktualisieren
          </button>
        )}
      </div>

      <PlanerKalender termine={geplant} onEventKlick={setAusgewaehlterTermin} />

      <div className="karte" style={{ marginTop: 16 }}>
        <h2>Platzhalter</h2>
        <p className="hinweistext">Termine, die dieses Jahr noch stattfinden müssen, deren Datum aber noch nicht feststeht.</p>
        {kannBearbeiten && (
          <form onSubmit={platzhalterAnlegen} style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input
              placeholder="Neuer Platzhalter, z. B. Sommerfest"
              value={neuerPlatzhalterTitel}
              onChange={(e) => setNeuerPlatzhalterTitel(e.target.value)}
              style={{ flex: 1 }}
            />
            <button type="submit">Anlegen</button>
          </form>
        )}
        {platzhalter.length === 0 ? (
          <p className="text-mute">Keine Platzhalter.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {platzhalter.map((p) => (
              <li key={p.id} style={{ padding: "4px 0", cursor: "pointer" }} onClick={() => setAusgewaehlterTermin(p)}>
                {p.titel}
              </li>
            ))}
          </ul>
        )}
      </div>

      {ueberfaellig.length > 0 && (
        <div className="karte" style={{ marginTop: 16, borderColor: "#b00020" }}>
          <h2 style={{ color: "#b00020" }}>Überfällig</h2>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {ueberfaellig.map((v) => (
              <li key={v.vorlage_id} style={{ padding: "4px 0" }}>
                <strong>{v.titel}</strong> — {v.tage_ueberfaellig} Tage überfällig
                {v.letztes_zieldatum && ` (zuletzt am ${v.letztes_zieldatum})`}
              </li>
            ))}
          </ul>
        </div>
      )}

      {ausgewaehlterTermin && (
        <PlanTerminDialog
          termin={ausgewaehlterTermin}
          kategorien={kategorien}
          kannBearbeiten={kannBearbeiten}
          onClose={() => setAusgewaehlterTermin(null)}
          onGeaendert={terminGeaendert}
        />
      )}
    </div>
  );
}
