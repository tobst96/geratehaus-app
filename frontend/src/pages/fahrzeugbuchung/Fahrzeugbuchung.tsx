import { useEffect, useRef, useState, type FormEvent } from "react";
import QRCode from "qrcode";
import { useAuth } from "../../context/AuthContext";
import { useConfig } from "../../context/ConfigContext";
import { oeffentlicheBasisUrl } from "../../utils/oeffentlicheUrl";
import {
  holeBuchungen,
  buchungAnfrage,
  buchungZurueckziehen,
  fahrzeugbuchungReservierungAnlegen,
} from "../../api/buchungen";
import { holeFahrzeugbuchungReservierung } from "../../api/fahrzeugbuchungReservierungen";
import { holeFahrzeuge } from "../../api/stammdaten";
import { barcodeVorschau, type BarcodeVorschau } from "../../api/auth";
import { ApiError } from "../../api/client";
import { BuchungsKalender } from "../../components/BuchungsKalender";
import { BarcodeEingabe } from "../../components/BarcodeEingabe";
import { useMitgliedModus } from "../../hooks/useMitgliedModus";
import { useBarcodeSound } from "../../hooks/useBarcodeSound";
import { Ladeanzeige } from "../../components/Ladeanzeige";
import type { BuchungOut, Fahrzeug } from "../../api/types";
import "../dienststunden/Dienststunden.css";

function jetztAlsDatetimeLocal(minutenSpaeter = 0): string {
  const jetzt = new Date();
  jetzt.setMinutes(jetzt.getMinutes() - jetzt.getTimezoneOffset() + minutenSpaeter);
  return jetzt.toISOString().slice(0, 16);
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

export function Fahrzeugbuchung() {
  const { angezeigterName, barcodeEinscannenEinmalig, kioskScanBeenden } = useAuth();
  const { config } = useConfig();
  const mitgliedModus = useMitgliedModus();
  const { spieleErkannt, spieleFehler } = useBarcodeSound();
  const [buchungen, setBuchungen] = useState<BuchungOut[] | null>(null);
  const [fahrzeuge, setFahrzeuge] = useState<Fahrzeug[]>([]);
  const [fehler, setFehler] = useState<string | null>(null);
  const [hinweis, setHinweis] = useState<string | null>(null);

  const [formularOffen, setFormularOffen] = useState(false);
  const [fahrzeugId, setFahrzeugId] = useState("");
  const [von, setVon] = useState(jetztAlsDatetimeLocal());
  const [bis, setBis] = useState(jetztAlsDatetimeLocal(120));
  const [zweck, setZweck] = useState("");
  const [barcode, setBarcode] = useState("");
  const [vorschau, setVorschau] = useState<BarcodeVorschau | null>(null);
  const [laeuft, setLaeuft] = useState(false);

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
    const wert = barcode.trim();
    if (!wert) {
      setVorschau(null);
      return;
    }
    const timeout = setTimeout(() => {
      barcodeVorschau(wert)
        .then((ergebnis) => {
          setVorschau(ergebnis);
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
      const { token, ablauf_am } = await fahrzeugbuchungReservierungAnlegen();
      const url = `${oeffentlicheBasisUrl(config)}/eintragen-fahrzeugbuchung/${token}`;
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
        const info = await holeFahrzeugbuchungReservierung(token);
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
          setTimeout(async () => {
            qrAnsichtZuruecksetzen();
            setFormularOffen(false);
            await laden();
          }, wartenMs);
        }
      } catch {
        // Best effort – wird beim nächsten Intervall erneut versucht.
      }
    }, 1500);
    return () => clearInterval(intervall);
  }, [qrAnsicht]);

  async function laden() {
    try {
      const [b, f] = await Promise.all([holeBuchungen(), holeFahrzeuge()]);
      setBuchungen(b);
      setFahrzeuge(f.filter((x) => x.buchbar));
      if (!fahrzeugId && f.length > 0) setFahrzeugId(String(f[0].id));
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Buchungen konnten nicht geladen werden.");
    }
  }

  useEffect(() => {
    laden();
  }, []);

  async function absenden(e: FormEvent) {
    e.preventDefault();
    if (!fahrzeugId || !zweck.trim() || (!mitgliedModus.aktiv && !barcode.trim())) return;
    setHinweis(null);
    setFehler(null);
    setLaeuft(true);
    try {
      if (!mitgliedModus.aktiv) {
        await barcodeEinscannenEinmalig(barcode.trim());
      }
      const ergebnis = await buchungAnfrage({
        fahrzeug_id: Number(fahrzeugId),
        von: new Date(von).toISOString(),
        bis: new Date(bis).toISOString(),
        zweck: zweck.trim(),
      });
      setHinweis(
        ergebnis.konflikt_hinweis
          ? "Anfrage gespeichert – Achtung, es gibt eine Überschneidung mit einer anderen Buchung. Der Moderator entscheidet."
          : "Anfrage gespeichert."
      );
      setZweck("");
      setBarcode("");
      setVorschau(null);
      setFormularOffen(false);
      await laden();
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Anfrage konnte nicht gestellt werden.");
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

  async function zurueckziehen(id: number) {
    try {
      await buchungZurueckziehen(id);
      await laden();
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Zurückziehen fehlgeschlagen.");
    }
  }

  if (fehler) return <div style={{ padding: "1rem", color: "red" }}>Fehler: {fehler}</div>;
  if (!buchungen) return <Ladeanzeige />;

  const eigeneAusstehende = buchungen.filter(
    (b) => b.status === "ausstehend" && b.verantwortliche_person_name === angezeigterName
  );

  return (
    <div>
      <h1>Fahrzeugbuchung</h1>

      {!formularOffen && <button style={{ marginBottom: 16 }} onClick={() => setFormularOffen(true)}>Neue Anfrage</button>}
      {hinweis && <p className="karte">{hinweis}</p>}
      {formularOffen && qrAnsicht && (
        <div className="karte dienststunden-qr-ansicht">
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
                  <div className="dienststunden-scan-initialen">{initialenAus(qrVorschauPerson.name)}</div>
                )}
                <div className="dienststunden-scan-name">{qrVorschauPerson.name}</div>
              </div>
            )}
          </div>
          <p style={{ fontSize: "0.8rem", color: "var(--farbe-text-mute)" }}>
            Gültig bis {new Date(qrAnsicht.ablaufAm).toLocaleTimeString("de-DE")}
          </p>
          <button type="button" className="sekundaer" onClick={qrAnsichtZuruecksetzen}>
            Zurück zum Formular
          </button>
        </div>
      )}
      {formularOffen && !qrAnsicht && (
        <form onSubmit={absenden} className="karte">
          <div className="formular-feld">
            <label htmlFor="fb-fahrzeug">Fahrzeug</label>
            <select id="fb-fahrzeug" value={fahrzeugId} onChange={(e) => setFahrzeugId(e.target.value)} required>
              {fahrzeuge.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
          <div className="formular-feld">
            <label htmlFor="fb-von">Von</label>
            <input id="fb-von" type="datetime-local" value={von} onChange={(e) => setVon(e.target.value)} required />
          </div>
          <div className="formular-feld">
            <label htmlFor="fb-bis">Bis</label>
            <input id="fb-bis" type="datetime-local" value={bis} onChange={(e) => setBis(e.target.value)} required />
          </div>
          <div className="formular-feld">
            <label htmlFor="fb-zweck">Zweck</label>
            <input id="fb-zweck" value={zweck} onChange={(e) => setZweck(e.target.value)} required />
          </div>
          {mitgliedModus.aktiv ? (
            <p style={{ color: "var(--farbe-text-mute)" }}>
              Eingeloggt als <strong>{mitgliedModus.name}</strong>
            </p>
          ) : (
            <div className="formular-feld">
              <label htmlFor="fb-barcode">Barcode scannen (wer bist du?)</label>
              <BarcodeEingabe
                id="fb-barcode"
                value={barcode}
                onChange={setBarcode}
                placeholder="Barcode scannen oder eingeben"
                autoFocus
                required
              />
              {vorschau && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                  {vorschau.bild_url && (
                    <img
                      src={vorschau.bild_url}
                      alt={vorschau.name}
                      style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }}
                    />
                  )}
                  <strong>{vorschau.name}</strong>
                </div>
              )}
            </div>
          )}
          {qrFehler && <p className="fehlertext">{qrFehler}</p>}
          <button type="submit" disabled={laeuft}>
            {laeuft ? "Wird gestellt…" : "Anfrage stellen"}
          </button>{" "}
          {!mitgliedModus.aktiv && (
            <button type="button" className="sekundaer" onClick={barcodeVergessenKlick} disabled={qrLaeuft}>
              {qrLaeuft ? "Erzeuge QR-Code …" : "Barcode vergessen"}
            </button>
          )}{" "}
          <button type="button" className="sekundaer" onClick={() => setFormularOffen(false)}>
            Abbrechen
          </button>
        </form>
      )}

      {eigeneAusstehende.length > 0 && (
        <div className="karte">
          <h2>Meine ausstehenden Anfragen</h2>
          {eigeneAusstehende.map((b) => (
            <div key={b.id} style={{ marginBottom: 8 }}>
              {b.fahrzeug_name}: {new Date(b.von).toLocaleString("de-DE")} –{" "}
              {new Date(b.bis).toLocaleString("de-DE")} ({b.zweck}){" "}
              <button className="sekundaer" onClick={() => zurueckziehen(b.id)}>
                Zurückziehen
              </button>
            </div>
          ))}
        </div>
      )}

      <BuchungsKalender buchungen={buchungen} />
    </div>
  );
}
