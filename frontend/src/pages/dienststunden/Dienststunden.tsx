import { useEffect, useRef, useState, type FormEvent } from "react";
import QRCode from "qrcode";
import {
  stundenErfassen,
  holeMeineSummen,
  dienststundenReservierungAnlegen,
} from "../../api/dienststunden";
import { holeDienststundenReservierung } from "../../api/dienststundenReservierungen";
import { holeFunktionenDienststunden } from "../../api/stammdaten";
import { barcodeVorschau, type BarcodeVorschau } from "../../api/auth";
import { ApiError } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useConfig } from "../../context/ConfigContext";
import { oeffentlicheBasisUrl } from "../../utils/oeffentlicheUrl";
import { BarcodeEingabe } from "../../components/BarcodeEingabe";
import { useMitgliedModus } from "../../hooks/useMitgliedModus";
import { useBarcodeSound } from "../../hooks/useBarcodeSound";
import type { DienststundenSummeOut, FunktionDienststunden } from "../../api/types";
import "./Dienststunden.css";

const SCHNELLAUSWAHL_STUNDEN = [0.25, 0.5, 1, 1.5, 2, 3, 4];
const STEPPER_SCHRITT = 0.25;
const STEPPER_MIN = 0.25;
const STEPPER_MAX = 12;

function stundenAnzeige(stunden: number): string {
  const gesamtMinuten = Math.round(stunden * 60);
  const std = Math.floor(gesamtMinuten / 60);
  const min = gesamtMinuten % 60;
  if (std === 0) return `${min} Min.`;
  if (min === 0) return `${std} Std.`;
  return `${std} Std. ${min} Min.`;
}

function heuteAlsDatum(): string {
  return new Date().toISOString().slice(0, 10);
}

function initialenAus(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((teil) => teil.charAt(0))
    .join("")
    .toUpperCase();
}

export function Dienststunden() {
  const { barcodeEinscannenEinmalig, kioskScanBeenden } = useAuth();
  const { config } = useConfig();
  const mitgliedModus = useMitgliedModus();
  const { spieleErkannt, spieleFehler } = useBarcodeSound();
  const [funktionen, setFunktionen] = useState<FunktionDienststunden[]>([]);
  const [ladeFehler, setLadeFehler] = useState<string | null>(null);

  const [barcode, setBarcode] = useState("");
  const [vorschau, setVorschau] = useState<BarcodeVorschau | null>(null);
  const [funktionId, setFunktionId] = useState<string>("");
  const [stunden, setStunden] = useState<number>(1);
  const [datum, setDatum] = useState(heuteAlsDatum());
  const [fehler, setFehler] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);

  const [letztePerson, setLetztePerson] = useState<string | null>(null);
  const [letzteSummen, setLetzteSummen] = useState<DienststundenSummeOut[] | null>(null);

  const [qrAnsicht, setQrAnsicht] = useState<{ token: string; bildUrl: string; ablaufAm: string } | null>(
    null
  );
  const [qrFehler, setQrFehler] = useState<string | null>(null);
  const [qrLaeuft, setQrLaeuft] = useState(false);
  const [qrVorschauPerson, setQrVorschauPerson] = useState<{ name: string; bildUrl: string | null } | null>(
    null
  );
  const qrVorschauGezeigtSeit = useRef<number | null>(null);
  const qrSchliessenGeplant = useRef(false);

  useEffect(() => {
    holeFunktionenDienststunden()
      .then((f) => {
        setFunktionen(f);
        if (f.length > 0) setFunktionId(String(f[0].id));
      })
      .catch((err) =>
        setLadeFehler(err instanceof ApiError ? String(err.detail) : "Funktionen konnten nicht geladen werden.")
      );
  }, []);

  // Live-Vorschau (Name + Bild) während des Scannens, debounced.
  useEffect(() => {
    const wert = barcode.trim();
    if (!wert) {
      setVorschau(null);
      return;
    }
    const timeout = setTimeout(() => {
      barcodeVorschau(wert)
        .then((v) => {
          setVorschau(v);
          if (v.funktion_id) setFunktionId(String(v.funktion_id));
          spieleErkannt();
        })
        .catch(() => {
          setVorschau(null);
          spieleFehler();
        });
    }, 250);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barcode]);

  function qrAnsichtZuruecksetzen() {
    setQrAnsicht(null);
    setQrVorschauPerson(null);
    qrVorschauGezeigtSeit.current = null;
    qrSchliessenGeplant.current = false;
  }

  async function barcodeVergessenKlick() {
    setQrLaeuft(true);
    setQrFehler(null);
    try {
      const { token, ablauf_am } = await dienststundenReservierungAnlegen();
      const url = `${oeffentlicheBasisUrl(config)}/eintragen-dienststunden/${token}`;
      const bildUrl = await QRCode.toDataURL(url, { width: 280, margin: 1 });
      setQrAnsicht({ token, bildUrl, ablaufAm: ablauf_am });
    } catch (err) {
      setQrFehler(err instanceof ApiError ? String(err.detail) : "QR-Code konnte nicht erzeugt werden.");
    } finally {
      setQrLaeuft(false);
    }
  }

  // Solange der QR-Code angezeigt wird, prüfen ob die Person sich auf dem
  // eigenen Handy schon ausgewählt bzw. eingetragen hat. Die Vorschau
  // (Name+Bild) muss mindestens 3 Sekunden sichtbar bleiben.
  useEffect(() => {
    if (!qrAnsicht) return;
    const token = qrAnsicht.token;
    const intervall = setInterval(async () => {
      try {
        const info = await holeDienststundenReservierung(token);
        if (info.vorschau_person_name && qrVorschauGezeigtSeit.current === null) {
          qrVorschauGezeigtSeit.current = Date.now();
        }
        if (info.vorschau_person_name) {
          setQrVorschauPerson({ name: info.vorschau_person_name, bildUrl: info.vorschau_bild_url });
        }
        if (info.bereits_eingeloest && !qrSchliessenGeplant.current) {
          qrSchliessenGeplant.current = true;
          const gezeigtSeit = qrVorschauGezeigtSeit.current;
          const wartenMs = gezeigtSeit ? Math.max(0, 3000 - (Date.now() - gezeigtSeit)) : 0;
          setTimeout(() => {
            qrAnsichtZuruecksetzen();
          }, wartenMs);
        }
      } catch {
        // Best effort – wird beim nächsten Intervall erneut versucht.
      }
    }, 1500);
    return () => clearInterval(intervall);
  }, [qrAnsicht]);

  async function absenden(e: FormEvent) {
    e.preventDefault();
    if (!funktionId || (!mitgliedModus.aktiv && !barcode.trim())) {
      setFehler("Barcode erforderlich");
      return;
    }
    setLaeuft(true);
    setFehler(null);
    try {
      const name = mitgliedModus.aktiv ? mitgliedModus.name : vorschau?.name ?? null;
      if (!mitgliedModus.aktiv) {
        await barcodeEinscannenEinmalig(barcode.trim());
      }
      await stundenErfassen(Number(funktionId), stunden, datum);
      const summen = await holeMeineSummen();
      setLetztePerson(name);
      setLetzteSummen(summen);
      setBarcode("");
      setVorschau(null);
      setStunden(1);
      setDatum(heuteAlsDatum());
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Stunden konnten nicht erfasst werden.");
    } finally {
      if (!mitgliedModus.aktiv) {
        // Kiosk: gescannte Identität galt nur für diese eine Eintragung – Cookie
        // serverseitig löschen, damit niemand eingeloggt bleibt (best effort).
        try {
          await kioskScanBeenden();
        } catch {
          // ignorieren
        }
      }
      setLaeuft(false);
    }
  }

  if (ladeFehler) return <div style={{ padding: "1rem", color: "red" }}>Fehler: {ladeFehler}</div>;

  return (
    <div>
      <h1>Dienststunden</h1>

      <div className="karte" style={{ marginBottom: 16 }}>
        <h2>Stunden erfassen</h2>

        {qrAnsicht ? (
          <div className="dienststunden-qr-ansicht">
            <p style={{ color: "var(--farbe-text-mute)" }}>
              Mit dem Handy scannen – die Person trägt sich dort selbst ein (ohne Barcode).
            </p>
            <div
              style={{
                display: "flex",
                gap: "1.5rem",
                alignItems: "center",
                flexWrap: "wrap",
                justifyContent: "center",
              }}
            >
              <img
                src={qrAnsicht.bildUrl}
                alt="QR-Code zum Eintragen ohne Barcode"
                className="dienststunden-qr-bild"
              />
              {qrVorschauPerson && (
                <div className="dienststunden-scan-vorschau">
                  {qrVorschauPerson.bildUrl ? (
                    <img
                      src={qrVorschauPerson.bildUrl}
                      alt={qrVorschauPerson.name}
                      className="dienststunden-scan-bild"
                    />
                  ) : (
                    <div className="dienststunden-scan-initialen">
                      {initialenAus(qrVorschauPerson.name)}
                    </div>
                  )}
                  <div className="dienststunden-scan-name">{qrVorschauPerson.name}</div>
                </div>
              )}
            </div>
            <p style={{ fontSize: "0.8rem", color: "var(--farbe-text-mute)" }}>
              Gültig bis {new Date(qrAnsicht.ablaufAm).toLocaleTimeString("de-DE")}
            </p>
            <button type="button" className="sekundaer" onClick={qrAnsichtZuruecksetzen}>
              Zurück zum Scannen
            </button>
          </div>
        ) : (
          <form onSubmit={absenden}>
            <div className="dienststunden-scan-layout">
              {!mitgliedModus.aktiv && vorschau && (
                <div className="dienststunden-scan-vorschau">
                  {vorschau.bild_url ? (
                    <img src={vorschau.bild_url} alt={vorschau.name} className="dienststunden-scan-bild" />
                  ) : (
                    <div className="dienststunden-scan-initialen">{initialenAus(vorschau.name)}</div>
                  )}
                  <div className="dienststunden-scan-name">{vorschau.name}</div>
                </div>
              )}

              <div className="dienststunden-scan-felder">
                <div className="formular-feld">
                  {mitgliedModus.aktiv ? (
                    <p style={{ color: "var(--farbe-text-mute)" }}>
                      Eingeloggt als <strong>{mitgliedModus.name}</strong>
                    </p>
                  ) : (
                    <>
                      <label htmlFor="ds-barcode">Barcode einscannen</label>
                      <BarcodeEingabe
                        id="ds-barcode"
                        type="text"
                        value={barcode}
                        onChange={setBarcode}
                        placeholder="Barcode scannen oder eingeben"
                        autoFocus
                        required
                      />
                    </>
                  )}
                </div>

                <div className="formular-feld">
                  <label htmlFor="ds-funktion">Funktion</label>
                  <select
                    id="ds-funktion"
                    value={funktionId}
                    onChange={(e) => setFunktionId(e.target.value)}
                    required
                  >
                    {funktionen.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="formular-feld">
                  <label>Stunden</label>
                  <div className="stunden-chips">
                    {SCHNELLAUSWAHL_STUNDEN.map((w) => (
                      <button
                        key={w}
                        type="button"
                        className={`stunden-chip${stunden === w ? " aktiv" : ""}`}
                        onClick={() => setStunden(w)}
                      >
                        {stundenAnzeige(w)}
                      </button>
                    ))}
                  </div>
                  <div className="stunden-stepper">
                    <button
                      type="button"
                      className="stunden-stepper-btn"
                      onClick={() => setStunden((v) => Math.max(STEPPER_MIN, Math.round((v - STEPPER_SCHRITT) * 4) / 4))}
                      disabled={stunden <= STEPPER_MIN}
                    >
                      −
                    </button>
                    <span className="stunden-anzeige">{stundenAnzeige(stunden)}</span>
                    <button
                      type="button"
                      className="stunden-stepper-btn"
                      onClick={() => setStunden((v) => Math.min(STEPPER_MAX, Math.round((v + STEPPER_SCHRITT) * 4) / 4))}
                      disabled={stunden >= STEPPER_MAX}
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="formular-feld">
                  <label htmlFor="ds-datum">Datum</label>
                  <input
                    id="ds-datum"
                    type="date"
                    value={datum}
                    onChange={(e) => setDatum(e.target.value)}
                    required
                  />
                </div>

                {fehler && <p className="fehlertext">{fehler}</p>}
                {qrFehler && <p className="fehlertext">{qrFehler}</p>}

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button type="submit" disabled={laeuft}>
                    {laeuft ? "Wird gespeichert…" : "Erfassen"}
                  </button>
                  {!mitgliedModus.aktiv && (
                    <button
                      type="button"
                      className="sekundaer"
                      onClick={barcodeVergessenKlick}
                      disabled={qrLaeuft}
                    >
                      {qrLaeuft ? "Erzeuge QR-Code …" : "Barcode vergessen"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </form>
        )}
      </div>

      {letzteSummen && (
        <>
          <h2>Kumulierte Stunden{letztePerson ? ` – ${letztePerson}` : ""}</h2>
          <div className="tabelle-scroll">
          <table>
            <thead>
              <tr>
                <th>Funktion</th>
                <th>Stunden</th>
                <th>Schwellenwert</th>
              </tr>
            </thead>
            <tbody>
              {letzteSummen.map((s) => (
                <tr key={s.funktion_id}>
                  <td>{s.funktion_name}</td>
                  <td
                    style={{
                      color: s.schwellenwert_ueberschritten ? "#b00020" : undefined,
                      fontWeight: s.schwellenwert_ueberschritten ? 700 : undefined,
                    }}
                  >
                    {s.summe_stunden}
                  </td>
                  <td>{s.schwellenwert_stunden || "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </>
      )}
    </div>
  );
}
