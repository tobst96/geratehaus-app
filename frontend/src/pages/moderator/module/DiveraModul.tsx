import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  diveraEinsaetzeNachholen,
  holeDiveraVorschlaege,
  holeEinstellungen,
  schreibeEinstellungen,
} from "../../../api/moderator";
import { ApiError } from "../../../api/client";
import { Ladeanzeige } from "../../../components/Ladeanzeige";
import { DiveraVorschlagModal } from "../../../components/DiveraVorschlagModal";

export function DiveraModul() {
  const [geladen, setGeladen] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [gespeichert, setGespeichert] = useState(false);
  const [speichert, setSpeichert] = useState(false);

  const [aktiv, setAktiv] = useState(false);
  const [modus, setModus] = useState("polling");
  const [apiKey, setApiKey] = useState("");
  const [letzterSync, setLetzterSync] = useState("");
  const [letzterSyncAnzahl, setLetzterSyncAnzahl] = useState(0);

  const [holenLaeuft, setHolenLaeuft] = useState(false);
  const [holenErgebnis, setHolenErgebnis] = useState<string | null>(null);

  const [zeigeVorschlag, setZeigeVorschlag] = useState(false);
  const [vorschlaegeAnzahl, setVorschlaegeAnzahl] = useState(0);

  async function ladeVorschlagAnzahl() {
    try {
      setVorschlaegeAnzahl((await holeDiveraVorschlaege()).length);
    } catch {
      setVorschlaegeAnzahl(0);
    }
  }

  useEffect(() => {
    holeEinstellungen()
      .then((w) => {
        setAktiv(Boolean(w.divera_aktiv));
        setModus(String(w.divera_modus ?? "polling"));
        setApiKey(String(w.divera_api_key ?? ""));
        setLetzterSync(String(w.divera_letzter_sync ?? ""));
        setLetzterSyncAnzahl(Number(w.divera_letzter_sync_anzahl ?? 0));
        setGeladen(true);
      })
      .catch((err) =>
        setFehler(err instanceof ApiError ? String(err.detail) : "Einstellungen konnten nicht geladen werden.")
      );
    ladeVorschlagAnzahl();
  }, []);

  async function speichern() {
    setSpeichert(true);
    setFehler(null);
    setGespeichert(false);
    try {
      await schreibeEinstellungen({
        divera_aktiv: aktiv,
        divera_modus: modus,
        divera_api_key: apiKey,
      });
      setGespeichert(true);
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Speichern fehlgeschlagen.");
    } finally {
      setSpeichert(false);
    }
  }

  async function einsaetzeHolen(tage: number) {
    setHolenLaeuft(true);
    setHolenErgebnis(null);
    try {
      const { anzahl_gefunden, anzahl_neu } = await diveraEinsaetzeNachholen(tage);
      const zeitraum = tage === 1 ? "24 Stunden" : `${tage} Tagen`;
      setHolenErgebnis(
        anzahl_gefunden === 0
          ? `Keine Alarme in den letzten ${zeitraum} gefunden.`
          : `${anzahl_gefunden} Alarm${anzahl_gefunden !== 1 ? "e" : ""} gefunden, ${anzahl_neu} neu importiert.`
      );
    } catch (err) {
      setHolenErgebnis(err instanceof ApiError ? String(err.detail) : "Abruf fehlgeschlagen.");
    } finally {
      setHolenLaeuft(false);
    }
  }

  if (fehler && !geladen) return <p className="fehlertext">{fehler}</p>;
  if (!geladen) return <Ladeanzeige />;

  return (
    <div>
      <p>
        <Link to="/moderator/module">← Zurück zu den Modulen</Link>
      </p>
      <h1>Divera 24/7</h1>

      <div className="karte" style={{ maxWidth: 640 }}>
        <h2>Anbindung</h2>
        <p style={{ fontSize: "0.85rem", color: "var(--farbe-text-mute)" }}>
          Ersetzt die frühere .env-Konfiguration – Änderungen wirken ohne Neustart.
        </p>
        <div className="formular-feld">
          <label>
            <input type="checkbox" checked={aktiv} onChange={(e) => setAktiv(e.target.checked)} /> Anbindung
            aktiv (automatisches Polling/Webhook)
          </label>
        </div>
        <div className="formular-feld">
          <label htmlFor="divera-modus">Modus</label>
          <select id="divera-modus" value={modus} onChange={(e) => setModus(e.target.value)}>
            <option value="polling">Polling (alle 5 Minuten abfragen)</option>
            <option value="webhook">Webhook (Divera sendet aktiv)</option>
          </select>
        </div>
        <div className="formular-feld">
          <label htmlFor="divera-key">API-Key / Accesskey</label>
          <input
            id="divera-key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Accesskey aus Divera"
            autoComplete="off"
          />
        </div>
        {letzterSync ? (
          <p style={{ fontSize: "0.85rem", color: "var(--farbe-text-mute)" }}>
            Letzter Polling-Abruf: {new Date(letzterSync).toLocaleString("de-DE")} &middot;{" "}
            {letzterSyncAnzahl} Alarm{letzterSyncAnzahl !== 1 ? "e" : ""} abgerufen
          </p>
        ) : (
          aktiv &&
          modus === "polling" && (
            <p style={{ fontSize: "0.85rem", color: "var(--farbe-text-mute)" }}>
              Noch kein Polling-Abruf seit dem letzten Start.
            </p>
          )
        )}
        <button onClick={speichern} disabled={speichert} style={{ marginTop: "0.5rem" }}>
          {speichert ? "Speichert …" : "Speichern"}
        </button>
        {gespeichert && (
          <span style={{ marginLeft: 10, color: "var(--farbe-text-mute)" }}>✓ gespeichert</span>
        )}
        {fehler && <p className="fehlertext">{fehler}</p>}
      </div>

      <div className="karte" style={{ maxWidth: 640, marginTop: 16 }}>
        <h2>Einsätze nachholen</h2>
        <p style={{ fontSize: "0.85rem", color: "var(--farbe-text-mute)" }}>
          Holt vergangene Alarme aus der Divera-Historie und legt fehlende Einsätze an.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={() => einsaetzeHolen(1)} disabled={holenLaeuft}>
            {holenLaeuft ? "Wird abgerufen…" : "Einsätze letzte 24 Stunden holen"}
          </button>
          <button type="button" className="sekundaer" onClick={() => einsaetzeHolen(7)} disabled={holenLaeuft}>
            {holenLaeuft ? "Wird abgerufen…" : "Einsätze letzte 7 Tage holen"}
          </button>
        </div>
        {holenErgebnis && (
          <p style={{ marginTop: "0.5rem", fontSize: "0.85rem", color: "var(--farbe-text-mute)" }}>
            {holenErgebnis}
          </p>
        )}
      </div>

      <div className="karte" style={{ maxWidth: 640, marginTop: 16 }}>
        <h2>Personen-Vorschlag</h2>
        <p style={{ fontSize: "0.85rem", color: "var(--farbe-text-mute)" }}>
          Gleicht das Divera-Personal mit dem System ab und schlägt neue Personen bzw.
          E-Mail-Aktualisierungen vor.
        </p>
        <button type="button" onClick={() => setZeigeVorschlag(true)}>
          Vorschläge öffnen{vorschlaegeAnzahl > 0 ? ` (${vorschlaegeAnzahl})` : ""}
        </button>
      </div>

      {zeigeVorschlag && (
        <DiveraVorschlagModal
          onSchliessen={() => {
            setZeigeVorschlag(false);
            ladeVorschlagAnzahl();
          }}
          onUebernommen={ladeVorschlagAnzahl}
        />
      )}
    </div>
  );
}
