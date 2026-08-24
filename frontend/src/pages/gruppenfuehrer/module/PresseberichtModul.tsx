import { Fehlertext } from "../../../components/Fehlertext";
import { Gespeichert } from "../../../components/Gespeichert";
import { Ladeanzeige } from "../../../components/Ladeanzeige";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../../../api/client";
import {
  holeAlleEinsatzFelder,
  holeEinstellungen,
  schreibeEinstellungen,
} from "../../../api/gruppenfuehrer";
import type { EinsatzFeldDefinition } from "../../../api/types";

type Modus = "schliessen" | "stunden" | "uhrzeit";

interface Einstellungen {
  grunddaten: boolean;
  zusatzfelder: string[];
  divera: boolean;
  teilnehmer_anzahl: boolean;
  teilnehmer_namen: boolean;
  fahrzeuge: boolean;
  minio_link: boolean;
  modus: Modus;
  stunden: number;
  uhrzeit: string;
}

function ausConfig(config: Record<string, unknown>): Einstellungen {
  const b = (k: string, d = false) => (typeof config[k] === "boolean" ? (config[k] as boolean) : d);
  return {
    grunddaten: b("pressebericht_felder_grunddaten", true),
    zusatzfelder: Array.isArray(config.pressebericht_zusatzfelder)
      ? (config.pressebericht_zusatzfelder as string[])
      : [],
    divera: b("pressebericht_felder_divera"),
    teilnehmer_anzahl: b("pressebericht_teilnehmer_anzahl", true),
    teilnehmer_namen: b("pressebericht_teilnehmer_namen"),
    fahrzeuge: b("pressebericht_fahrzeuge", true),
    minio_link: b("pressebericht_minio_link"),
    modus: (["schliessen", "stunden", "uhrzeit"].includes(config.pressebericht_versand_modus as string)
      ? (config.pressebericht_versand_modus as Modus)
      : "schliessen"),
    stunden: typeof config.pressebericht_versand_stunden === "number"
      ? (config.pressebericht_versand_stunden as number)
      : 24,
    uhrzeit: typeof config.pressebericht_versand_uhrzeit === "string"
      ? (config.pressebericht_versand_uhrzeit as string)
      : "08:00",
  };
}

export function PresseberichtModul() {
  const [einst, setEinst] = useState<Einstellungen | null>(null);
  const [felder, setFelder] = useState<EinsatzFeldDefinition[]>([]);
  const [fehler, setFehler] = useState<string | null>(null);
  const [gespeichert, setGespeichert] = useState(false);
  const [laeuft, setLaeuft] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setEinst(ausConfig(await holeEinstellungen()));
      } catch (err) {
        setFehler(err instanceof ApiError ? String(err.detail) : "Laden fehlgeschlagen.");
        return;
      }
      // Zusatzfelder best-effort: fehlt das stammdaten-Recht, bleibt nur die
      // Zusatzfeld-Auswahl leer, der Rest der Einstellungen ist trotzdem bedienbar.
      try {
        setFelder(await holeAlleEinsatzFelder());
      } catch {
        setFelder([]);
      }
    })();
  }, []);

  function feld<K extends keyof Einstellungen>(key: K, wert: Einstellungen[K]) {
    setEinst((e) => (e ? { ...e, [key]: wert } : e));
    setGespeichert(false);
  }

  function zusatzfeldUmschalten(schluessel: string) {
    setEinst((e) => {
      if (!e) return e;
      const set = new Set(e.zusatzfelder);
      if (set.has(schluessel)) {
        set.delete(schluessel);
      } else {
        set.add(schluessel);
      }
      return { ...e, zusatzfelder: [...set] };
    });
    setGespeichert(false);
  }

  async function speichern() {
    if (!einst) return;
    setLaeuft(true);
    setFehler(null);
    setGespeichert(false);
    try {
      await schreibeEinstellungen({
        pressebericht_felder_grunddaten: einst.grunddaten,
        pressebericht_zusatzfelder: einst.zusatzfelder,
        pressebericht_felder_divera: einst.divera,
        pressebericht_teilnehmer_anzahl: einst.teilnehmer_anzahl,
        pressebericht_teilnehmer_namen: einst.teilnehmer_namen,
        pressebericht_fahrzeuge: einst.fahrzeuge,
        pressebericht_minio_link: einst.minio_link,
        pressebericht_versand_modus: einst.modus,
        pressebericht_versand_stunden: einst.stunden,
        pressebericht_versand_uhrzeit: einst.uhrzeit,
      });
      setGespeichert(true);
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Speichern fehlgeschlagen.");
    } finally {
      setLaeuft(false);
    }
  }

  if (!einst) return <Ladeanzeige />;

  return (
    <div>
      <p>
        <Link to="/gruppenfuehrer/module">← Zurück zu den Modulen</Link>
      </p>
      <h1>Pressebericht</h1>
      <p className="hinweistext">
        Legt fest, welche Informationen der Pressebericht eines Einsatzes enthält und wann er als
        PDF an die Abonnenten des Ereignisses „Pressebericht" versendet wird. Der Bericht wird
        zusätzlich im MinIO-Einsatzordner abgelegt und der Versand in der Einsatz-Timeline vermerkt.
        Empfänger legen ihr Abo im Personal-Bereich unter „Benachrichtigungskanäle" an.
      </p>

      {fehler && <Fehlertext>{fehler}</Fehlertext>}

      <div className="karte">
        <h2>Inhalt des Berichts</h2>
        <div className="formular-feld">
          <label>
            <input
              type="checkbox"
              checked={einst.grunddaten}
              onChange={(e) => feld("grunddaten", e.target.checked)}
            />{" "}
            Einsatz-Grunddaten (Titel, Zeitpunkt, Adresse, Meldung, Einsatznummer)
          </label>
        </div>
        <div className="formular-feld">
          <label>
            <input
              type="checkbox"
              checked={einst.divera}
              onChange={(e) => feld("divera", e.target.checked)}
            />{" "}
            Divera-Informationen (nur bei Einsätzen aus Divera)
          </label>
        </div>
        <div className="formular-feld">
          <label>
            <input
              type="checkbox"
              checked={einst.teilnehmer_anzahl}
              onChange={(e) => feld("teilnehmer_anzahl", e.target.checked)}
            />{" "}
            Gesamtzahl der beteiligten Personen
          </label>
        </div>
        <div className="formular-feld">
          <label>
            <input
              type="checkbox"
              checked={einst.teilnehmer_namen}
              onChange={(e) => feld("teilnehmer_namen", e.target.checked)}
            />{" "}
            Namensliste der beteiligten Personen
          </label>
        </div>
        <div className="formular-feld">
          <label>
            <input
              type="checkbox"
              checked={einst.fahrzeuge}
              onChange={(e) => feld("fahrzeuge", e.target.checked)}
            />{" "}
            Auflistung der Fahrzeuge mit Besatzung
          </label>
        </div>
        <div className="formular-feld">
          <label>
            <input
              type="checkbox"
              checked={einst.minio_link}
              onChange={(e) => feld("minio_link", e.target.checked)}
            />{" "}
            Link zum MinIO-Einsatzordner (App-intern, Login erforderlich)
          </label>
        </div>
      </div>

      <div className="karte">
        <h2>Zusatzfelder</h2>
        <p className="hinweistext">
          Einzeln wählbar, welche Einsatz-Zusatzfelder im Bericht erscheinen (leere Werte werden
          automatisch weggelassen).
        </p>
        {felder.length === 0 ? (
          <p className="hinweistext">Keine Einsatz-Zusatzfelder definiert.</p>
        ) : (
          felder.map((f) => (
            <div className="formular-feld" key={f.schluessel}>
              <label>
                <input
                  type="checkbox"
                  checked={einst.zusatzfelder.includes(f.schluessel)}
                  onChange={() => zusatzfeldUmschalten(f.schluessel)}
                />{" "}
                {f.label}
              </label>
            </div>
          ))
        )}
      </div>

      <div className="karte">
        <h2>Versandzeitpunkt</h2>
        <div className="formular-feld">
          <label htmlFor="pb-modus">Wann wird der Pressebericht versendet?</label>
          <select
            id="pb-modus"
            value={einst.modus}
            onChange={(e) => feld("modus", e.target.value as Modus)}
          >
            <option value="schliessen">Sofort beim Abschließen des Einsatzes</option>
            <option value="stunden">Eine bestimmte Anzahl Stunden nach Abschluss</option>
            <option value="uhrzeit">Täglich zu einer festen Uhrzeit (nur abgeschlossene Einsätze)</option>
          </select>
        </div>
        {einst.modus === "stunden" && (
          <div className="formular-feld">
            <label htmlFor="pb-stunden">Stunden nach Abschluss</label>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                id="pb-stunden"
                type="number"
                min={0}
                value={einst.stunden}
                onChange={(e) => feld("stunden", Number(e.target.value))}
                style={{ width: 100 }}
              />
              <span>Stunden</span>
            </div>
            <p className="hinweistext">
              Zeitspanne <strong>nach dem Abschluss</strong> des Einsatzes (keine Uhrzeit). Beispiel:
              24 = der Bericht geht rund 24 Stunden nach dem Abschließen raus. Ein Hintergrund-Job
              prüft dafür alle 15 Minuten.
            </p>
          </div>
        )}
        {einst.modus === "uhrzeit" && (
          <div className="formular-feld">
            <label htmlFor="pb-uhrzeit">Uhrzeit</label>
            <input
              id="pb-uhrzeit"
              type="time"
              value={einst.uhrzeit}
              onChange={(e) => feld("uhrzeit", e.target.value)}
            />
            <p className="hinweistext">
              Einmal täglich zu dieser Uhrzeit für alle bereits abgeschlossenen Einsätze, die noch
              keinen Pressebericht haben.
            </p>
          </div>
        )}
      </div>

      <div className="formular-feld">
        <button onClick={speichern} disabled={laeuft}>
          Speichern
        </button>
        {gespeichert && <Gespeichert />}
      </div>
    </div>
  );
}
