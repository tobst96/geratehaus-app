import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Fehlertext } from "../../components/Fehlertext";
import { Ladeanzeige } from "../../components/Ladeanzeige";
import { PlanerKalender, type TerminVerschiebung } from "../../components/PlanerKalender";
import { PlanTerminDialog } from "../../components/PlanTerminDialog";
import { ApiError } from "../../api/client";
import {
  aktualisiereTermin,
  holeFeiertage,
  holeKategorien,
  holeTermine,
  holeUeberfaelligeVorlagen,
  importiereJahr,
  ladeJahresExport,
  legePlatzhalterAn,
  legeTerminAn,
  stelleJahrSicher,
  uebertrageAnDivera,
  type ImportErgebnis,
} from "../../api/dienstbuchPlaner";
import type {
  DiveraUebertragungErgebnis,
  FeiertagOut,
  PlanerKategorieOut,
  PlanTerminOut,
  VorlageUeberfaelligOut,
} from "../../api/types";

function datumZuIso(d: Date): string {
  const jahr = d.getFullYear();
  const monat = String(d.getMonth() + 1).padStart(2, "0");
  const tag = String(d.getDate()).padStart(2, "0");
  return `${jahr}-${monat}-${tag}`;
}

export function DienstbuchPlaner() {
  // QR-Codes auf dem Excel-Export öffnen den Planer direkt im passenden
  // Monat (?jahr=&monat=).
  const [searchParams] = useSearchParams();
  // Eine Quelle der Wahrheit für den sichtbaren Zeitraum: die Jahres-Buttons
  // und die Kalender-Navigation ändern beide dieses Datum; das geladene Jahr
  // folgt daraus (behebt: "Jahr weiter -> Termine nicht sichtbar", weil der
  // Kalender vorher auf dem heutigen Monat stehen blieb).
  const [datum, setDatum] = useState(() => {
    const jahrParam = Number(searchParams.get("jahr"));
    const monatParam = Number(searchParams.get("monat"));
    if (jahrParam >= 2000 && jahrParam <= 2200) {
      return new Date(jahrParam, monatParam >= 1 && monatParam <= 12 ? monatParam - 1 : 0, 1);
    }
    return new Date();
  });
  const jahr = datum.getFullYear();
  const [termine, setTermine] = useState<PlanTerminOut[] | null>(null);
  const [kategorien, setKategorien] = useState<PlanerKategorieOut[]>([]);
  const [ueberfaellig, setUeberfaellig] = useState<VorlageUeberfaelligOut[]>([]);
  const [feiertage, setFeiertage] = useState<FeiertagOut[]>([]);
  const importDatei = useRef<HTMLInputElement>(null);
  const [importErgebnis, setImportErgebnis] = useState<ImportErgebnis | null>(null);
  // Divera-Übertragung: Auswahl per Checkbox in der Terminliste.
  const [diveraAuswahl, setDiveraAuswahl] = useState<number[]>([]);
  const [diveraGruppen, setDiveraGruppen] = useState("");
  const [diveraErinnerung, setDiveraErinnerung] = useState("");
  const [diveraErgebnisse, setDiveraErgebnisse] = useState<DiveraUebertragungErgebnis[] | null>(null);
  const [diveraLaeuft, setDiveraLaeuft] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [ausgewaehlterTermin, setAusgewaehlterTermin] = useState<PlanTerminOut | null>(null);

  const [neuerPlatzhalterTitel, setNeuerPlatzhalterTitel] = useState("");
  const [gezogenerPlatzhalter, setGezogenerPlatzhalter] = useState<PlanTerminOut | null>(null);
  // Klick auf einen freien Kalendertag: Mini-Dialog zum direkten Anlegen dort.
  const [slotDatum, setSlotDatum] = useState<Date | null>(null);
  const [slotTitel, setSlotTitel] = useState("");
  const [slotUhrzeit, setSlotUhrzeit] = useState("");
  const [slotEndzeit, setSlotEndzeit] = useState("");
  const [slotSpeichert, setSlotSpeichert] = useState(false);

  async function laden() {
    try {
      const [t, k, u, f] = await Promise.all([
        holeTermine(jahr),
        holeKategorien(),
        holeUeberfaelligeVorlagen(),
        holeFeiertage(jahr),
      ]);
      setTermine(t);
      setKategorien(k);
      setUeberfaellig(u);
      setFeiertage(f);
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Daten konnten nicht geladen werden.");
    }
  }

  useEffect(() => {
    laden();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jahr]);

  function jahrWechseln(richtung: number) {
    // In den Januar des Zieljahres springen, damit die (Entwurfs-)Termine des
    // Jahres sofort im sichtbaren Kalenderbereich liegen.
    setDatum(new Date(jahr + richtung, 0, 1));
  }

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
    setSlotEndzeit("");
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
        endzeit: slotUhrzeit && slotEndzeit ? `${slotEndzeit}:00` : null,
      });
      setSlotDatum(null);
      await laden();
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Termin konnte nicht angelegt werden.");
    } finally {
      setSlotSpeichert(false);
    }
  }

  async function terminVerschoben(termin: PlanTerminOut, verschiebung: TerminVerschiebung) {
    try {
      await aktualisiereTermin(termin.id, {
        zieldatum: datumZuIso(verschiebung.zieldatum),
        ...(verschiebung.zeitenGeaendert
          ? { uhrzeit: verschiebung.uhrzeit, endzeit: verschiebung.endzeit }
          : {}),
      });
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

  async function importStarten(datei: File) {
    setImportErgebnis(null);
    setFehler(null);
    try {
      setImportErgebnis(await importiereJahr(jahr, datei));
      await laden();
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Import fehlgeschlagen.");
    }
  }

  function diveraAuswahlUmschalten(id: number) {
    setDiveraAuswahl((vorher) => (vorher.includes(id) ? vorher.filter((x) => x !== id) : [...vorher, id]));
  }

  async function diveraUebertragen() {
    if (diveraAuswahl.length === 0) return;
    setDiveraLaeuft(true);
    setDiveraErgebnisse(null);
    try {
      const gruppen = diveraGruppen
        .split(",")
        .map((g) => g.trim())
        .filter(Boolean);
      const ergebnisse = await uebertrageAnDivera({
        termin_ids: diveraAuswahl,
        gruppen,
        erinnerung_minuten: diveraErinnerung ? Number(diveraErinnerung) : null,
      });
      setDiveraErgebnisse(ergebnisse);
      if (ergebnisse.every((e) => e.ok)) setDiveraAuswahl([]);
      await laden();
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Divera-Übertragung fehlgeschlagen.");
    } finally {
      setDiveraLaeuft(false);
    }
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
        <button className="sekundaer" onClick={() => jahrWechseln(-1)}>
          ← {jahr - 1}
        </button>
        <strong>{jahr}</strong>
        <button className="sekundaer" onClick={() => jahrWechseln(1)}>
          {jahr + 1} →
        </button>
        <span style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link to="/gruppenfuehrer/module/dienstbuch_planer">
            <button className="sekundaer" type="button">Vorlagen &amp; Kategorien</button>
          </Link>
          <button className="sekundaer" onClick={jahrSicherstellen}>
            Termine für {jahr} aus Vorjahr + Vorlagen erzeugen
          </button>
          <button className="sekundaer" onClick={() => ladeJahresExport(jahr)}>
            Excel-Export
          </button>
          <button className="sekundaer" onClick={() => importDatei.current?.click()}>
            Excel-Import
          </button>
          <input
            ref={importDatei}
            type="file"
            accept=".xlsx"
            style={{ display: "none" }}
            onChange={(e) => {
              const datei = e.target.files?.[0];
              if (datei) importStarten(datei);
              e.target.value = "";
            }}
          />
        </span>
      </div>

      {importErgebnis && (
        <p className="hinweistext">
          Import: {importErgebnis.angelegt} angelegt, {importErgebnis.uebersprungen} übersprungen
          {importErgebnis.fehler.length > 0 && `, ${importErgebnis.fehler.length} Fehler`}
          {importErgebnis.fehler.slice(0, 5).map((f) => (
            <span key={`${f.zeile}-${f.fehler}`}>
              <br />Zeile {f.zeile}: {f.fehler}
            </span>
          ))}
        </p>
      )}

      <PlanerKalender
        termine={geplant}
        feiertage={feiertage}
        datum={datum}
        onDatumWechsel={setDatum}
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
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <div className="formular-feld">
                <label htmlFor="slot-uhrzeit">Beginn (optional)</label>
                <input
                  id="slot-uhrzeit"
                  type="time"
                  value={slotUhrzeit}
                  onChange={(e) => setSlotUhrzeit(e.target.value)}
                />
              </div>
              <div className="formular-feld">
                <label htmlFor="slot-endzeit">Ende (optional)</label>
                <input
                  id="slot-endzeit"
                  type="time"
                  value={slotEndzeit}
                  onChange={(e) => setSlotEndzeit(e.target.value)}
                  disabled={!slotUhrzeit}
                />
              </div>
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

      <div className="karte" style={{ marginTop: 16 }}>
        <h2>An Divera übertragen</h2>
        <p className="hinweistext">
          Ausgewählte Termine als Divera-Termine anlegen (mit Rückmelde-Funktion in der Divera-App).
          Ohne Gruppenangabe geht der Termin an alle des Standorts. Voraussetzung: Divera-Modul mit
          API-Key konfiguriert.
        </p>
        {geplant.filter((t) => t.zieldatum).length === 0 ? (
          <p className="text-mute">Keine Termine mit Datum in {jahr}.</p>
        ) : (
          <>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 12px 0", maxHeight: 220, overflowY: "auto" }}>
              {geplant
                .filter((t) => t.zieldatum)
                .map((t) => (
                  <li key={t.id} style={{ padding: "2px 0" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <input
                        type="checkbox"
                        checked={diveraAuswahl.includes(t.id)}
                        onChange={() => diveraAuswahlUmschalten(t.id)}
                      />
                      {t.zieldatum}
                      {t.uhrzeit && ` ${t.uhrzeit.slice(0, 5)}`} · {t.titel}
                      {t.status === "entwurf" && <span className="text-mute"> (Entwurf)</span>}
                    </label>
                  </li>
                ))}
            </ul>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <input
                placeholder="Gruppen (Komma-getrennt, leer = alle)"
                value={diveraGruppen}
                onChange={(e) => setDiveraGruppen(e.target.value)}
                style={{ flex: 1, minWidth: 220 }}
              />
              <input
                type="number"
                min={1}
                placeholder="Erinnerung (min)"
                value={diveraErinnerung}
                onChange={(e) => setDiveraErinnerung(e.target.value)}
                style={{ width: 140 }}
              />
              <button onClick={diveraUebertragen} disabled={diveraLaeuft || diveraAuswahl.length === 0}>
                {diveraLaeuft ? "Überträgt …" : `${diveraAuswahl.length} Termin(e) übertragen`}
              </button>
            </div>
            {diveraErgebnisse && (
              <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 0 0", fontSize: "0.85rem" }}>
                {diveraErgebnisse.map((e) => (
                  <li key={e.termin_id}>
                    {e.ok ? "✅" : "❌"} {e.titel || `Termin ${e.termin_id}`}
                    {!e.ok && ` – ${e.fehler}`}
                  </li>
                ))}
              </ul>
            )}
          </>
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
