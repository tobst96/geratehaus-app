import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Fehlertext } from "../../components/Fehlertext";
import { Ladeanzeige } from "../../components/Ladeanzeige";
import { PlanerKalender } from "../../components/PlanerKalender";
import { PlanTerminDialog } from "../../components/PlanTerminDialog";
import { ApiError } from "../../api/client";
import {
  aktualisiereTermin,
  holeKategorien,
  holeTermine,
  holeUeberfaelligeVorlagen,
  legePlatzhalterAn,
  legeTerminAn,
  stelleJahrSicher,
} from "../../api/dienstbuchPlaner";
import type { PlanerKategorieOut, PlanTerminOut, VorlageUeberfaelligOut } from "../../api/types";

function datumZuIso(d: Date): string {
  const jahr = d.getFullYear();
  const monat = String(d.getMonth() + 1).padStart(2, "0");
  const tag = String(d.getDate()).padStart(2, "0");
  return `${jahr}-${monat}-${tag}`;
}

export function DienstbuchPlaner() {
  const [jahr, setJahr] = useState(new Date().getFullYear());
  const [termine, setTermine] = useState<PlanTerminOut[] | null>(null);
  const [kategorien, setKategorien] = useState<PlanerKategorieOut[]>([]);
  const [ueberfaellig, setUeberfaellig] = useState<VorlageUeberfaelligOut[]>([]);
  const [fehler, setFehler] = useState<string | null>(null);
  const [ausgewaehlterTermin, setAusgewaehlterTermin] = useState<PlanTerminOut | null>(null);

  const [neuerPlatzhalterTitel, setNeuerPlatzhalterTitel] = useState("");
  const [neuerTerminTitel, setNeuerTerminTitel] = useState("");
  const [neuerTerminDatum, setNeuerTerminDatum] = useState("");
  const [neuerTerminUhrzeit, setNeuerTerminUhrzeit] = useState("");
  const [gezogenerPlatzhalter, setGezogenerPlatzhalter] = useState<PlanTerminOut | null>(null);
  // Klick auf einen freien Kalendertag: Mini-Dialog zum direkten Anlegen dort.
  const [slotDatum, setSlotDatum] = useState<Date | null>(null);
  const [slotTitel, setSlotTitel] = useState("");
  const [slotUhrzeit, setSlotUhrzeit] = useState("");
  const [slotSpeichert, setSlotSpeichert] = useState(false);

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

  async function terminAnlegen(e: FormEvent) {
    e.preventDefault();
    if (!neuerTerminTitel.trim() || !neuerTerminDatum) return;
    try {
      await legeTerminAn({
        titel: neuerTerminTitel.trim(),
        zieldatum: neuerTerminDatum,
        uhrzeit: neuerTerminUhrzeit || null,
      });
      setNeuerTerminTitel("");
      setNeuerTerminDatum("");
      setNeuerTerminUhrzeit("");
      await laden();
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Termin konnte nicht angelegt werden.");
    }
  }

  function slotAngeklickt(datum: Date) {
    setSlotDatum(datum);
    setSlotTitel("");
    // Klick in der Wochen-/Tagesansicht bringt eine konkrete Uhrzeit mit;
    // in der Monatsansicht (Mitternacht) bleibt das Uhrzeit-Feld leer.
    const stunden = datum.getHours();
    const minuten = datum.getMinutes();
    setSlotUhrzeit(
      stunden === 0 && minuten === 0
        ? ""
        : `${String(stunden).padStart(2, "0")}:${String(minuten).padStart(2, "0")}`
    );
  }

  async function slotTerminAnlegen(e: FormEvent) {
    e.preventDefault();
    if (!slotDatum || !slotTitel.trim()) return;
    setSlotSpeichert(true);
    try {
      await legeTerminAn({
        titel: slotTitel.trim(),
        zieldatum: datumZuIso(slotDatum),
        uhrzeit: slotUhrzeit ? `${slotUhrzeit}:00` : null,
      });
      setSlotDatum(null);
      await laden();
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Termin konnte nicht angelegt werden.");
    } finally {
      setSlotSpeichert(false);
    }
  }

  async function terminVerschoben(termin: PlanTerminOut, neuesDatum: Date) {
    try {
      await aktualisiereTermin(termin.id, { zieldatum: datumZuIso(neuesDatum) });
      await laden();
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Verschieben fehlgeschlagen.");
    }
  }

  async function platzhalterAbgelegt(datum: Date) {
    if (!gezogenerPlatzhalter) return;
    try {
      await aktualisiereTermin(gezogenerPlatzhalter.id, { zieldatum: datumZuIso(datum) });
      setGezogenerPlatzhalter(null);
      await laden();
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Terminieren fehlgeschlagen.");
    }
  }

  function terminGeaendert() {
    setAusgewaehlterTermin(null);
    laden();
  }

  if (fehler && !termine) return <Fehlertext>{fehler}</Fehlertext>;
  if (!termine) return <Ladeanzeige />;

  const platzhalter = termine.filter((t) => t.ist_platzhalter);
  const geplant = termine.filter((t) => !t.ist_platzhalter);

  return (
    <div>
      <h1>Dienstbuch Planer</h1>
      {fehler && <Fehlertext>{fehler}</Fehlertext>}

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <button className="sekundaer" onClick={() => setJahr((j) => j - 1)}>
          ← {jahr - 1}
        </button>
        <strong>{jahr}</strong>
        <button className="sekundaer" onClick={() => setJahr((j) => j + 1)}>
          {jahr + 1} →
        </button>
        <span style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link to="/gruppenfuehrer/module/dienstbuch_planer">
            <button className="sekundaer" type="button">Vorlagen &amp; Kategorien</button>
          </Link>
          <button className="sekundaer" onClick={jahrSicherstellen}>
            Termine für {jahr} aus Vorlagen aktualisieren
          </button>
        </span>
      </div>

      <PlanerKalender
        termine={geplant}
        onEventKlick={setAusgewaehlterTermin}
        onSlotKlick={slotAngeklickt}
        onTerminVerschoben={terminVerschoben}
        onVonAussenAbgelegt={platzhalterAbgelegt}
        externerDragTitel={gezogenerPlatzhalter?.titel ?? null}
      />

      {slotDatum && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1rem",
          }}
          onClick={() => setSlotDatum(null)}
        >
          <form
            className="karte"
            style={{ maxWidth: 420, width: "100%" }}
            onClick={(e) => e.stopPropagation()}
            onSubmit={slotTerminAnlegen}
          >
            <h2>Termin am {slotDatum.toLocaleDateString("de-DE")}</h2>
            <div className="formular-feld">
              <label htmlFor="slot-titel">Titel</label>
              <input
                id="slot-titel"
                autoFocus
                value={slotTitel}
                onChange={(e) => setSlotTitel(e.target.value)}
                placeholder="z. B. Übungsdienst"
              />
            </div>
            <div className="formular-feld">
              <label htmlFor="slot-uhrzeit">Uhrzeit (optional)</label>
              <input
                id="slot-uhrzeit"
                type="time"
                value={slotUhrzeit}
                onChange={(e) => setSlotUhrzeit(e.target.value)}
              />
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button type="submit" disabled={slotSpeichert || !slotTitel.trim()}>
                Anlegen
              </button>
              <button type="button" className="sekundaer" onClick={() => setSlotDatum(null)}>
                Abbrechen
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="karte" style={{ marginTop: 16 }}>
        <h2>Neuer Termin</h2>
        <form onSubmit={terminAnlegen} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input
            placeholder="Titel, z. B. Sondersitzung"
            value={neuerTerminTitel}
            onChange={(e) => setNeuerTerminTitel(e.target.value)}
            style={{ flex: 1, minWidth: 180 }}
          />
          <input
            type="date"
            value={neuerTerminDatum}
            onChange={(e) => setNeuerTerminDatum(e.target.value)}
            aria-label="Datum"
          />
          <input
            type="time"
            value={neuerTerminUhrzeit}
            onChange={(e) => setNeuerTerminUhrzeit(e.target.value)}
            aria-label="Uhrzeit (optional)"
          />
          <button type="submit">Anlegen</button>
        </form>
      </div>

      <div className="karte" style={{ marginTop: 16 }}>
        <h2>Platzhalter</h2>
        <p className="hinweistext">
          Termine, die dieses Jahr noch stattfinden müssen, deren Datum aber noch nicht feststeht.
          Zum Terminieren einfach auf den Kalender ziehen (oder anklicken und ein Datum setzen).
        </p>
        <form onSubmit={platzhalterAnlegen} style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input
            placeholder="Neuer Platzhalter, z. B. Sommerfest"
            value={neuerPlatzhalterTitel}
            onChange={(e) => setNeuerPlatzhalterTitel(e.target.value)}
            style={{ flex: 1 }}
          />
          <button type="submit">Anlegen</button>
        </form>
        {platzhalter.length === 0 ? (
          <p className="text-mute">Keine Platzhalter.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {platzhalter.map((p) => (
              <li
                key={p.id}
                draggable
                onDragStart={() => setGezogenerPlatzhalter(p)}
                onDragEnd={() => setGezogenerPlatzhalter(null)}
                onClick={() => setAusgewaehlterTermin(p)}
                style={{ padding: "6px 8px", cursor: "grab", border: "1px dashed var(--farbe-rand)", borderRadius: 6, marginBottom: 6 }}
              >
                📌 {p.titel}
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
          kannBearbeiten={true}
          onClose={() => setAusgewaehlterTermin(null)}
          onGeaendert={terminGeaendert}
        />
      )}
    </div>
  );
}
