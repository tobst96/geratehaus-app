import { useEffect, useState } from "react";
import { getISOWeek } from "date-fns";
import {
  aktualisiereTermin,
  bestaetigeTermin,
  holeTerminEreignisse,
  legeVorlageAn,
  setzeTerminAufEntwurf,
} from "../api/dienstbuchPlaner";
import { ApiError } from "../api/client";
import { formatiereDatumZeit } from "../utils/datum";
import type { PlanerKategorieOut, PlanTerminEreignisOut, PlanTerminOut } from "../api/types";
import { Fehlertext } from "./Fehlertext";

interface PlanTerminDialogProps {
  termin: PlanTerminOut;
  kategorien: PlanerKategorieOut[];
  kannBearbeiten: boolean;
  onClose: () => void;
  onGeaendert: () => void;
}

export function PlanTerminDialog({
  termin,
  kategorien,
  kannBearbeiten,
  onClose,
  onGeaendert,
}: PlanTerminDialogProps) {
  const [titel, setTitel] = useState(termin.titel);
  const [beschreibung, setBeschreibung] = useState(termin.beschreibung ?? "");
  const [zieldatum, setZieldatum] = useState(termin.zieldatum ?? "");
  const [uhrzeit, setUhrzeit] = useState(termin.uhrzeit?.slice(0, 5) ?? "");
  const [endzeit, setEndzeit] = useState(termin.endzeit?.slice(0, 5) ?? "");
  const [kategorieIds, setKategorieIds] = useState<number[]>(termin.kategorien.map((k) => k.id));
  const [speichert, setSpeichert] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [ereignisse, setEreignisse] = useState<PlanTerminEreignisOut[] | null>(null);
  const [vorlageAngelegt, setVorlageAngelegt] = useState(false);

  useEffect(() => {
    holeTerminEreignisse(termin.id)
      .then(setEreignisse)
      .catch(() => setEreignisse([]));
  }, [termin.id]);

  function kategorieUmschalten(id: number) {
    setKategorieIds((vorher) => (vorher.includes(id) ? vorher.filter((x) => x !== id) : [...vorher, id]));
  }

  async function speichern() {
    setSpeichert(true);
    setFehler(null);
    try {
      await aktualisiereTermin(termin.id, {
        titel,
        beschreibung: beschreibung || null,
        // Bekommt ein Platzhalter hier ein Datum, wird er serverseitig
        // automatisch zum normalen Termin.
        zieldatum: zieldatum || null,
        uhrzeit: uhrzeit ? `${uhrzeit}:00` : null,
        endzeit: uhrzeit && endzeit ? `${endzeit}:00` : null,
        kategorie_ids: kategorieIds,
      });
      onGeaendert();
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Speichern fehlgeschlagen.");
    } finally {
      setSpeichert(false);
    }
  }

  async function alsVorlageSpeichern() {
    if (!zieldatum) return;
    setSpeichert(true);
    setFehler(null);
    try {
      const datum = new Date(`${zieldatum}T00:00:00`);
      await legeVorlageAn({
        titel,
        beschreibung: beschreibung || null,
        wiederholungstyp: "jaehrlich",
        // Backend-Konvention 0=Montag..6=Sonntag (JS: 0=Sonntag).
        wochentag: (datum.getDay() + 6) % 7,
        kalenderwoche: getISOWeek(datum),
        uhrzeit: uhrzeit ? `${uhrzeit}:00` : null,
        endzeit: uhrzeit && endzeit ? `${endzeit}:00` : null,
        startdatum: zieldatum,
        kategorie_ids: kategorieIds,
      });
      setVorlageAngelegt(true);
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Vorlage konnte nicht angelegt werden.");
    } finally {
      setSpeichert(false);
    }
  }

  async function statusUmschalten() {
    setSpeichert(true);
    setFehler(null);
    try {
      if (termin.status === "entwurf") {
        await bestaetigeTermin(termin.id);
      } else {
        await setzeTerminAufEntwurf(termin.id);
      }
      onGeaendert();
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Aktion fehlgeschlagen.");
    } finally {
      setSpeichert(false);
    }
  }

  return (
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
      onClick={onClose}
    >
      <div
        className="karte"
        style={{ maxWidth: 560, width: "100%", maxHeight: "90vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2>{termin.ist_platzhalter ? "Platzhalter" : "Termin"}</h2>

        <div className="formular-feld">
          <label htmlFor="termin-titel">Titel</label>
          <input
            id="termin-titel"
            value={titel}
            onChange={(e) => setTitel(e.target.value)}
            disabled={!kannBearbeiten}
          />
        </div>

        <div className="formular-feld">
          <label htmlFor="termin-beschreibung">Beschreibung</label>
          <textarea
            id="termin-beschreibung"
            value={beschreibung}
            onChange={(e) => setBeschreibung(e.target.value)}
            disabled={!kannBearbeiten}
          />
        </div>

        <div className="formular-feld">
          <label htmlFor="termin-datum">
            {termin.ist_platzhalter ? "Zieldatum (setzen = Platzhalter terminieren)" : "Zieldatum"}
          </label>
          <input
            id="termin-datum"
            type="date"
            value={zieldatum}
            onChange={(e) => setZieldatum(e.target.value)}
            disabled={!kannBearbeiten}
          />
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div className="formular-feld">
            <label htmlFor="termin-uhrzeit">Beginn (optional)</label>
            <input
              id="termin-uhrzeit"
              type="time"
              value={uhrzeit}
              onChange={(e) => setUhrzeit(e.target.value)}
              disabled={!kannBearbeiten}
            />
          </div>
          <div className="formular-feld">
            <label htmlFor="termin-endzeit">Ende (optional)</label>
            <input
              id="termin-endzeit"
              type="time"
              value={endzeit}
              onChange={(e) => setEndzeit(e.target.value)}
              disabled={!kannBearbeiten || !uhrzeit}
            />
          </div>
        </div>

        {kategorien.length > 0 && (
          <div style={{ margin: "8px 0" }}>
            <p style={{ margin: "4px 0" }}>Kategorien</p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {kategorien.map((k) => (
                <label key={k.id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <input
                    type="checkbox"
                    checked={kategorieIds.includes(k.id)}
                    onChange={() => kategorieUmschalten(k.id)}
                    disabled={!kannBearbeiten}
                  />
                  {k.name}
                </label>
              ))}
            </div>
          </div>
        )}

        <p>
          Status: <strong>{termin.status === "bestaetigt" ? "Bestätigt" : "Entwurf"}</strong>
          {termin.dienstbuch_id && " · mit Dienstbuch verknüpft"}
        </p>

        {fehler && <Fehlertext>{fehler}</Fehlertext>}

        {kannBearbeiten && (
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <button type="button" onClick={speichern} disabled={speichert}>
              Speichern
            </button>
            {!termin.dienstbuch_id && !termin.ist_platzhalter && (
              <button type="button" className="sekundaer" onClick={statusUmschalten} disabled={speichert}>
                {termin.status === "entwurf" ? "Bestätigen" : "Auf Entwurf zurücksetzen"}
              </button>
            )}
            {!termin.vorlage_id && !!zieldatum && !vorlageAngelegt && (
              <button type="button" className="sekundaer" onClick={alsVorlageSpeichern} disabled={speichert}>
                Als jährliche Vorlage speichern
              </button>
            )}
            {vorlageAngelegt && (
              <span>
                ✓ Vorlage angelegt – Feineinstellungen unter „Vorlagen &amp; Kategorien"
              </span>
            )}
            <button type="button" className="sekundaer" onClick={onClose}>
              Schließen
            </button>
          </div>
        )}
        {!kannBearbeiten && (
          <div style={{ marginTop: 12 }}>
            <button type="button" className="sekundaer" onClick={onClose}>
              Schließen
            </button>
          </div>
        )}

        {ereignisse && ereignisse.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <p style={{ margin: "4px 0" }}>Verlauf</p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {ereignisse
                .slice()
                .reverse()
                .map((e) => (
                  <li key={e.id} style={{ fontSize: "0.8rem", padding: "2px 0", color: "var(--farbe-text-mute)" }}>
                    {formatiereDatumZeit(e.zeitpunkt)} — {e.beschreibung}
                    {e.akteur_name && ` · von ${e.akteur_name}`}
                  </li>
                ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
