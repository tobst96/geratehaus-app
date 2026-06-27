import { useEffect, useState } from "react";
import {
  diveraVorschlaegeSynchronisieren,
  diveraVorschlagEntscheiden,
  holeDiveraVorschlaege,
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
  const [fehler, setFehler] = useState<string | null>(null);
  const [verarbeitetIds, setVerarbeitetIds] = useState<number[]>([]);

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
  }, []);

  async function entscheiden(v: DiveraVorschlagOut, aktion: "uebernehmen" | "ignorieren") {
    try {
      await diveraVorschlagEntscheiden(v.id, aktion);
      setVerarbeitetIds((ids) => [...ids, v.id]);
      if (aktion === "uebernehmen") onUebernommen();
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Aktion fehlgeschlagen.");
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
                <h3>Neue Personen ({neue.length})</h3>
                {neue.map((v) => (
                  <VorschlagKarte key={v.id} vorschlag={v} onEntscheiden={entscheiden} />
                ))}
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
