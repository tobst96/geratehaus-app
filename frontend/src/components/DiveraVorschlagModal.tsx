import { useEffect, useState } from "react";
import {
  diveraIgnorierteZuruecksetzen,
  diveraVorschlaegeAlleUebernehmen,
  diveraVorschlaegeSynchronisieren,
  diveraVorschlagEntscheiden,
  holeDiveraVorschlaege,
  holeIgnorierteDiveraVorschlaege,
  type DiveraVorschlagOut,
} from "../api/moderator";
import { ApiError } from "../api/client";
import { Ladeanzeige } from "./Ladeanzeige";

interface Props {
  onSchliessen: () => void;
  onUebernommen: () => void;
}

export function DiveraVorschlagModal({ onSchliessen, onUebernommen }: Props) {
  const [vorschlaege, setVorschlaege] = useState<DiveraVorschlagOut[] | null>(null);
  const [ignorierte, setIgnorierte] = useState<DiveraVorschlagOut[]>([]);
  const [zeigeIgnorierte, setZeigeIgnorierte] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [verarbeitetIds, setVerarbeitetIds] = useState<number[]>([]);
  const [alleLaeuft, setAlleLaeuft] = useState(false);

  async function ignorierteLaden() {
    try {
      setIgnorierte(await holeIgnorierteDiveraVorschlaege());
    } catch {
      setIgnorierte([]);
    }
  }

  useEffect(() => {
    diveraVorschlaegeSynchronisieren()
      .then(setVorschlaege)
      .catch(async (err) => {
        if (err instanceof ApiError) {
          setFehler(String(err.detail));
          try {
            setVorschlaege(await holeDiveraVorschlaege());
          } catch {
            setVorschlaege([]);
          }
        } else {
          setFehler("Vorschläge konnten nicht geladen werden.");
        }
      });
    ignorierteLaden();
  }, []);

  async function entscheiden(v: DiveraVorschlagOut, aktion: "uebernehmen" | "ignorieren") {
    try {
      await diveraVorschlagEntscheiden(v.id, aktion);
      setVerarbeitetIds((ids) => [...ids, v.id]);
      if (aktion === "uebernehmen") onUebernommen();
      // Bei „ignorieren" wandert der Vorschlag in die ignorierte Liste.
      if (aktion === "ignorieren") ignorierteLaden();
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Aktion fehlgeschlagen.");
    }
  }

  async function ignoriertHinzufuegen(v: DiveraVorschlagOut) {
    try {
      await diveraVorschlagEntscheiden(v.id, "uebernehmen");
      setIgnorierte((liste) => liste.filter((x) => x.id !== v.id));
      onUebernommen();
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Aktion fehlgeschlagen.");
    }
  }

  async function ignorierteWiederVorschlagen() {
    try {
      const offeneNeu = await diveraIgnorierteZuruecksetzen();
      setVorschlaege(offeneNeu);
      setVerarbeitetIds([]);
      setIgnorierte([]);
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Aktion fehlgeschlagen.");
    }
  }

  async function alleHinzufuegen() {
    setAlleLaeuft(true);
    setFehler(null);
    try {
      const verbleibend = await diveraVorschlaegeAlleUebernehmen();
      setVorschlaege(verbleibend);
      setVerarbeitetIds([]);
      onUebernommen();
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Aktion fehlgeschlagen.");
    } finally {
      setAlleLaeuft(false);
    }
  }

  const offene = (vorschlaege ?? []).filter((v) => !verarbeitetIds.includes(v.id));
  const neue = offene.filter((v) => v.art === "neu");
  const emailUpdates = offene.filter((v) => v.art === "email_update");

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onSchliessen}
    >
      <div
        className="karte"
        style={{ width: 520, maxWidth: "92vw", maxHeight: "85vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ margin: 0 }}>Divera-Vorschläge</h2>
          <button type="button" className="sekundaer" onClick={onSchliessen}>
            Schließen
          </button>
        </div>

        {fehler && <p className="fehlertext">{fehler}</p>}

        {vorschlaege === null ? (
          <Ladeanzeige />
        ) : offene.length === 0 ? (
          <p style={{ color: "var(--farbe-text-mute)" }}>
            Keine offenen Vorschläge – Divera-Personal ist mit dem System synchron.
          </p>
        ) : (
          <>
            {neue.length > 0 && (
              <section style={{ marginTop: 16 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <h3 style={{ margin: 0 }}>Neue Personen ({neue.length})</h3>
                  <button type="button" onClick={alleHinzufuegen} disabled={alleLaeuft}>
                    {alleLaeuft ? "Fügt hinzu …" : `Alle hinzufügen (${neue.length})`}
                  </button>
                </div>
                <div style={{ marginTop: 8 }}>
                  {neue.map((v) => (
                    <VorschlagKarte key={v.id} vorschlag={v} onEntscheiden={entscheiden} />
                  ))}
                </div>
              </section>
            )}
            {emailUpdates.length > 0 && (
              <section style={{ marginTop: 16 }}>
                <h3>E-Mail-Aktualisierungen ({emailUpdates.length})</h3>
                {emailUpdates.map((v) => (
                  <VorschlagKarte key={v.id} vorschlag={v} onEntscheiden={entscheiden} />
                ))}
              </section>
            )}
          </>
        )}

        {ignorierte.length > 0 && (
          <section style={{ marginTop: 20, borderTop: "1px solid var(--farbe-rahmen, #ddd)", paddingTop: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <button
                type="button"
                className="sekundaer"
                onClick={() => setZeigeIgnorierte((v) => !v)}
                style={{ flex: 1, textAlign: "left" }}
              >
                {zeigeIgnorierte ? "▾" : "▸"} Ignorierte ({ignorierte.length})
              </button>
              {zeigeIgnorierte && (
                <button type="button" className="sekundaer" onClick={ignorierteWiederVorschlagen}>
                  Alle wieder vorschlagen
                </button>
              )}
            </div>
            {zeigeIgnorierte && (
              <div style={{ marginTop: 8 }}>
                {ignorierte.map((v) => (
                  <div
                    key={v.id}
                    className="karte"
                    style={{ marginTop: 8, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}
                  >
                    <div>
                      <strong>{String(v.vorschlag_daten.name ?? "")}</strong>
                      {v.art === "email_update" && (
                        <div style={{ color: "var(--farbe-text-mute)" }}>E-Mail-Aktualisierung</div>
                      )}
                    </div>
                    <button type="button" onClick={() => ignoriertHinzufuegen(v)} style={{ flexShrink: 0 }}>
                      Doch hinzufügen
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function VorschlagKarte({
  vorschlag,
  onEntscheiden,
}: {
  vorschlag: DiveraVorschlagOut;
  onEntscheiden: (v: DiveraVorschlagOut, aktion: "uebernehmen" | "ignorieren") => void;
}) {
  const daten = vorschlag.vorschlag_daten;
  return (
    <div
      className="karte"
      style={{ marginTop: 8, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}
    >
      <div>
        {vorschlag.art === "neu" ? (
          <>
            <strong>{String(daten.name ?? "")}</strong>
            {daten.email ? <div style={{ color: "var(--farbe-text-mute)" }}>{String(daten.email)}</div> : null}
          </>
        ) : (
          <>
            <strong>{String(daten.name ?? "")}</strong>
            <div style={{ color: "var(--farbe-text-mute)" }}>
              „{String(daten.alte_email ?? "–")}“ → „{String(daten.neue_email ?? "")}“
            </div>
          </>
        )}
      </div>
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <button type="button" className="sekundaer" onClick={() => onEntscheiden(vorschlag, "ignorieren")}>
          Ignorieren
        </button>
        <button type="button" onClick={() => onEntscheiden(vorschlag, "uebernehmen")}>
          {vorschlag.art === "neu" ? "Hinzufügen" : "Übernehmen"}
        </button>
      </div>
    </div>
  );
}
