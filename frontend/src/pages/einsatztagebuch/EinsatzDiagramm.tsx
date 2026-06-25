import { useEffect, useRef, useState, type FormEvent } from "react";
import QRCode from "qrcode";
import {
  einsatzAlleEingetragen,
  einsatzFehlversuchProtokollieren,
  einsatzZusatzfelderAktualisieren,
  holeEinsatzFelder,
  reservierungAnlegen,
  teilnahmeEintragen,
} from "../../api/einsaetze";
import { holeReservierung } from "../../api/reservierungen";
import { barcodeVorschau, type BarcodeVorschau } from "../../api/auth";
import { ApiError } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useConfig } from "../../context/ConfigContext";
import type { EinsatzFeldDefinition, EinsatzOut, Fahrzeug, FunktionEinsatz, TeilnahmeOut } from "../../api/types";
import "./EinsatzDiagramm.css";

function formatiereCountdown(sekunden: number): string {
  const m = Math.floor(sekunden / 60);
  const s = sekunden % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
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

interface EinsatzDiagrammProps {
  einsatz: EinsatzOut;
  fahrzeuge: Fahrzeug[];
  funktionen: FunktionEinsatz[];
  onAktualisiert: () => Promise<void>;
  onCancel: () => void;
}

interface AusgewaehlteAktion {
  fahrzeug: Fahrzeug | null;
  sitzplatzId: string | null;
  bezeichnung: string;
  nurGeraetehaus: boolean;
  aufAnfahrt: boolean;
}

const AGT_MAX_MINUTEN = 35;
const AGT_DEFAULT_MINUTEN = 30;

export function EinsatzDiagramm({ einsatz, fahrzeuge, onAktualisiert, onCancel }: EinsatzDiagrammProps) {
  const { barcodeEinscannen } = useAuth();
  const { config } = useConfig();
  const [aktivesFahrzeugId, setAktivesFahrzeugId] = useState<number | null>(null);
  const [ausgewaehlteAktion, setAusgewaehlteAktion] = useState<AusgewaehlteAktion | null>(null);
  const [barcode, setBarcode] = useState("");
  const [vorschau, setVorschau] = useState<BarcodeVorschau | null>(null);
  const [vab, setVab] = useState(false);
  const [atemschutzAktiv, setAtemschutzAktiv] = useState(false);
  const [atemschutzminuten, setAtemschutzminuten] = useState(0);
  const [bemerkung, setBemerkung] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);

  const [qrAnsicht, setQrAnsicht] = useState<{ token: string; bildUrl: string; ablaufAm: string } | null>(
    null
  );
  const [qrFehler, setQrFehler] = useState<string | null>(null);
  const [qrLaeuft, setQrLaeuft] = useState(false);

  const [alleEingetragenLaeuft, setAlleEingetragenLaeuft] = useState(false);
  const [alleEingetragenFehler, setAlleEingetragenFehler] = useState<string | null>(null);

  const [felder, setFelder] = useState<EinsatzFeldDefinition[] | null>(null);
  const [feldWerte, setFeldWerte] = useState<Record<string, string | boolean>>(einsatz.zusatzfelder);
  const [felderSpeichern, setFelderSpeichern] = useState(false);

  const countdownStartSekunden = (config?.einsatz_countdown_minuten ?? 30) * 60;
  const [restSekunden, setRestSekunden] = useState(countdownStartSekunden);
  const letzteTeilnehmerZahl = useRef(einsatz.teilnahmen.length);

  useEffect(() => {
    holeEinsatzFelder().then(setFelder).catch(() => setFelder([]));
  }, []);

  useEffect(() => {
    setFeldWerte(einsatz.zusatzfelder);
  }, [einsatz.zusatzfelder]);

  // Live-Vorschau (Name + Bild) während des Scannens, debounced, damit nicht
  // bei jedem Tastendruck ein Request raus geht.
  useEffect(() => {
    const wert = barcode.trim();
    if (!wert) {
      setVorschau(null);
      return;
    }
    const timeout = setTimeout(() => {
      barcodeVorschau(wert)
        .then(setVorschau)
        .catch(() => setVorschau(null));
    }, 250);
    return () => clearTimeout(timeout);
  }, [barcode]);

  // Countdown läuft unabhängig vom Render-Zyklus runter und schließt die
  // Garage-Ansicht automatisch, wenn er abläuft.
  useEffect(() => {
    const intervall = setInterval(() => {
      setRestSekunden((vorher) => Math.max(0, vorher - 1));
    }, 1000);
    return () => clearInterval(intervall);
  }, []);

  useEffect(() => {
    if (restSekunden === 0) {
      onCancel();
    }
  }, [restSekunden, onCancel]);

  // Springt auf den Startwert zurück, sobald sich jemand neu einträgt.
  useEffect(() => {
    if (einsatz.teilnahmen.length !== letzteTeilnehmerZahl.current) {
      letzteTeilnehmerZahl.current = einsatz.teilnahmen.length;
      setRestSekunden(countdownStartSekunden);
    }
  }, [einsatz.teilnahmen.length, countdownStartSekunden]);

  // Solange ein Fahrzeug geöffnet ist, regelmäßig aktualisieren – damit
  // Eintragungen, die jemand per QR-Code ("Barcode vergessen") auf dem
  // eigenen Handy abgeschlossen hat, ohne manuelle Navigation sichtbar werden.
  useEffect(() => {
    if (aktivesFahrzeugId === null) return;
    const intervall = setInterval(() => {
      onAktualisiert();
    }, 8000);
    return () => clearInterval(intervall);
  }, [aktivesFahrzeugId, onAktualisiert]);

  // Solange der QR-Code angezeigt wird, prüfen ob die Person sich auf dem
  // eigenen Handy schon eingetragen hat – dann den Dialog automatisch schließen.
  useEffect(() => {
    if (!qrAnsicht) return;
    const token = qrAnsicht.token;
    const intervall = setInterval(async () => {
      try {
        const info = await holeReservierung(token);
        if (info.bereits_eingeloest) {
          await onAktualisiert();
          setQrAnsicht(null);
          setAusgewaehlteAktion(null);
        }
      } catch {
        // Best effort – wird beim nächsten Intervall erneut versucht.
      }
    }, 3000);
    return () => clearInterval(intervall);
  }, [qrAnsicht, onAktualisiert]);

  const belegungByKey = new Map<string, TeilnahmeOut>();
  for (const t of einsatz.teilnahmen) {
    if (t.fahrzeug_id != null && t.sitzplatz_id != null) {
      belegungByKey.set(`${t.fahrzeug_id}:${t.sitzplatz_id}`, t);
    }
  }
  const geraetehausTeilnehmer = einsatz.teilnahmen.filter((t) => t.nur_geraetehaus);
  const anfahrtTeilnehmer = einsatz.teilnahmen.filter((t) => t.auf_anfahrt);

  function teilnehmerZahl(fahrzeugId: number): number {
    return einsatz.teilnahmen.filter((t) => t.fahrzeug_id === fahrzeugId).length;
  }

  function sitzKlick(fahrzeug: Fahrzeug, sitzplatzId: string, bezeichnung: string) {
    setAusgewaehlteAktion({ fahrzeug, sitzplatzId, bezeichnung, nurGeraetehaus: false, aufAnfahrt: false });
    setBarcode("");
    setVorschau(null);
    setQrAnsicht(null);
    setQrFehler(null);
    setVab(false);
    setAtemschutzAktiv(false);
    setAtemschutzminuten(0);
    setBemerkung("");
    setFehler(null);
  }

  function geraetehausKlick() {
    setAusgewaehlteAktion({
      fahrzeug: null,
      sitzplatzId: null,
      bezeichnung: "Einsatzbereit im Feuerwehrhaus",
      nurGeraetehaus: true,
      aufAnfahrt: false,
    });
    setBarcode("");
    setVorschau(null);
    setQrAnsicht(null);
    setQrFehler(null);
    setVab(false);
    setAtemschutzAktiv(false);
    setAtemschutzminuten(0);
    setBemerkung("");
    setFehler(null);
  }

  function anfahrtKlick() {
    setAusgewaehlteAktion({
      fahrzeug: null,
      sitzplatzId: null,
      bezeichnung: "Auf Anfahrt gewesen",
      nurGeraetehaus: false,
      aufAnfahrt: true,
    });
    setBarcode("");
    setVorschau(null);
    setQrAnsicht(null);
    setQrFehler(null);
    setVab(false);
    setAtemschutzAktiv(false);
    setAtemschutzminuten(0);
    setBemerkung("");
    setFehler(null);
  }

  async function eintragen(e: FormEvent) {
    e.preventDefault();
    if (!ausgewaehlteAktion || !barcode.trim()) {
      setFehler("Barcode erforderlich");
      return;
    }
    setLaeuft(true);
    setFehler(null);
    try {
      await barcodeEinscannen(barcode.trim());
      await teilnahmeEintragen(einsatz.id, {
        fahrzeug_id: ausgewaehlteAktion.fahrzeug?.id ?? null,
        sitzplatz_id: ausgewaehlteAktion.sitzplatzId,
        funktion_id: null,
        vab,
        atemschutzminuten: atemschutzAktiv ? atemschutzminuten : 0,
        nur_geraetehaus: ausgewaehlteAktion.nurGeraetehaus,
        auf_anfahrt: ausgewaehlteAktion.aufAnfahrt,
        bemerkung: bemerkung.trim() || null,
      });
      await onAktualisiert();
      setAusgewaehlteAktion(null);
      setAktivesFahrzeugId(null);
    } catch (err) {
      const nachricht = err instanceof ApiError ? String(err.detail) : "Eintragung fehlgeschlagen.";
      setFehler(nachricht);
      const ort = ausgewaehlteAktion.fahrzeug
        ? `${ausgewaehlteAktion.fahrzeug.name} – ${ausgewaehlteAktion.bezeichnung}`
        : ausgewaehlteAktion.bezeichnung;
      try {
        await einsatzFehlversuchProtokollieren(einsatz.id, nachricht, ort);
      } catch {
        // Protokollierung des Fehlversuchs ist best-effort, soll die eigentliche
        // Fehlermeldung an die Person nicht verschlucken.
      }
    } finally {
      setLaeuft(false);
    }
  }

  async function barcodeVergessenKlick() {
    if (!ausgewaehlteAktion) return;
    setQrLaeuft(true);
    setQrFehler(null);
    try {
      const { token, ablauf_am } = await reservierungAnlegen(einsatz.id, {
        fahrzeug_id: ausgewaehlteAktion.fahrzeug?.id ?? null,
        sitzplatz_id: ausgewaehlteAktion.sitzplatzId,
        bezeichnung: ausgewaehlteAktion.fahrzeug
          ? `${ausgewaehlteAktion.fahrzeug.name} – ${ausgewaehlteAktion.bezeichnung}`
          : ausgewaehlteAktion.bezeichnung,
        nur_geraetehaus: ausgewaehlteAktion.nurGeraetehaus,
        auf_anfahrt: ausgewaehlteAktion.aufAnfahrt,
      });
      const url = `${window.location.origin}/eintragen/${token}`;
      const bildUrl = await QRCode.toDataURL(url, { width: 280, margin: 1 });
      setQrAnsicht({ token, bildUrl, ablaufAm: ablauf_am });
    } catch (err) {
      setQrFehler(err instanceof ApiError ? String(err.detail) : "QR-Code konnte nicht erzeugt werden.");
    } finally {
      setQrLaeuft(false);
    }
  }

  async function feldWertAendern(schluessel: string, wert: string | boolean) {
    setFeldWerte((vorher) => ({ ...vorher, [schluessel]: wert }));
  }

  async function felderSpeichernKlick() {
    setFelderSpeichern(true);
    try {
      await einsatzZusatzfelderAktualisieren(einsatz.id, feldWerte);
      await onAktualisiert();
    } finally {
      setFelderSpeichern(false);
    }
  }

  async function zusatzfelderBestEffortSpeichern() {
    if (felder && felder.length > 0) {
      try {
        await einsatzZusatzfelderAktualisieren(einsatz.id, feldWerte);
      } catch {
        // Speichern ist best-effort, soll das Verlassen der Ansicht nicht blockieren.
      }
    }
  }

  async function zurueckKlick() {
    await zusatzfelderBestEffortSpeichern();
    onCancel();
  }

  async function alleEingetragenKlick() {
    setAlleEingetragenLaeuft(true);
    setAlleEingetragenFehler(null);
    try {
      await zusatzfelderBestEffortSpeichern();
      await einsatzAlleEingetragen(einsatz.id);
      onCancel();
    } catch (err) {
      setAlleEingetragenFehler(err instanceof ApiError ? String(err.detail) : "Konnte nicht eingeplant werden.");
    } finally {
      setAlleEingetragenLaeuft(false);
    }
  }

  const aktiveFahrzeuge = fahrzeuge.filter((f) => f.aktiv);
  const aktivesFahrzeug = aktiveFahrzeuge.find((f) => f.id === aktivesFahrzeugId) ?? null;
  const hatLinkeSpalte = (felder && felder.length > 0) || geraetehausTeilnehmer.length > 0;

  return (
    <div>
      <div className="einsatz-kopf">
        <h2 style={{ margin: 0 }}>{einsatz.titel}</h2>
        <span
          className={`einsatz-countdown ${restSekunden <= 60 ? "einsatz-countdown-warnung" : ""}`}
          title="Zeit bis die Garage-Ansicht automatisch schließt"
        >
          {formatiereCountdown(restSekunden)}
        </span>
      </div>

      {!aktivesFahrzeug && (
        <>
          <div className="einsatz-uebersicht">
            {hatLinkeSpalte && (
            <div className="einsatz-uebersicht-spalte">
              {felder && felder.length > 0 && (
                <div className="karte">
                  <h3>Einsatzdetails</h3>
                  {felder.map((f) => (
                    <div key={f.schluessel} style={{ marginBottom: "0.75rem" }}>
                      {f.typ === "checkbox" ? (
                        <label>
                          <input
                            type="checkbox"
                            checked={Boolean(feldWerte[f.schluessel])}
                            onChange={(e) => feldWertAendern(f.schluessel, e.target.checked)}
                          />{" "}
                          {f.label}
                        </label>
                      ) : (
                        <>
                          <label htmlFor={`feld-${f.schluessel}`}>{f.label}</label>
                          {f.typ === "mehrzeilig" ? (
                            <textarea
                              id={`feld-${f.schluessel}`}
                              rows={3}
                              value={String(feldWerte[f.schluessel] ?? "")}
                              onChange={(e) => feldWertAendern(f.schluessel, e.target.value)}
                            />
                          ) : (
                            <input
                              id={`feld-${f.schluessel}`}
                              type="text"
                              value={String(feldWerte[f.schluessel] ?? "")}
                              onChange={(e) => feldWertAendern(f.schluessel, e.target.value)}
                            />
                          )}
                        </>
                      )}
                    </div>
                  ))}
                  <button onClick={felderSpeichernKlick} disabled={felderSpeichern}>
                    {felderSpeichern ? "Speichert …" : "Einsatzdetails speichern"}
                  </button>
                </div>
              )}

              {geraetehausTeilnehmer.length > 0 && (
                <div className="karte">
                  <h3>Einsatzbereit im Feuerwehrhaus</h3>
                  <ul>
                    {geraetehausTeilnehmer.map((t) => (
                      <li key={t.id}>
                        {t.person_name}
                        {t.bemerkung ? ` – ${t.bemerkung}` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            </div>
            )}

            <div className="einsatz-uebersicht-spalte">
              <p style={{ color: "#666", fontSize: "0.9rem", marginTop: 0 }}>
                Fahrzeug auswählen, um Sitzplätze zu belegen.
              </p>
              <div className="fahrzeug-buttons">
                {aktiveFahrzeuge.map((f) => (
                  <button key={f.id} type="button" className="fahrzeug-button" onClick={() => setAktivesFahrzeugId(f.id)}>
                    <span className="fahrzeug-button-name">{f.name}</span>
                    <span className="fahrzeug-button-zahl">{teilnehmerZahl(f.id)} eingetragen</span>
                  </button>
                ))}
                <button type="button" className="fahrzeug-button fahrzeug-button-geraetehaus" onClick={geraetehausKlick}>
                  <span className="fahrzeug-button-name">Einsatzbereit im Feuerwehrhaus</span>
                  <span className="fahrzeug-button-zahl">{geraetehausTeilnehmer.length} eingetragen</span>
                </button>
                <button type="button" className="fahrzeug-button fahrzeug-button-geraetehaus" onClick={anfahrtKlick}>
                  <span className="fahrzeug-button-name">Auf Anfahrt gewesen</span>
                  <span className="fahrzeug-button-zahl">{anfahrtTeilnehmer.length} eingetragen</span>
                </button>
              </div>
            </div>
          </div>

          <div style={{ marginTop: "1.5rem", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button className="sekundaer" onClick={zurueckKlick}>
              Zurück
            </button>
            <button onClick={alleEingetragenKlick} disabled={alleEingetragenLaeuft}>
              {alleEingetragenLaeuft ? "Wird eingeplant …" : "Alle eingetragen"}
            </button>
            {alleEingetragenFehler && <span className="fehlertext">{alleEingetragenFehler}</span>}
          </div>
        </>
      )}

      {aktivesFahrzeug && (
        <div className="garage garage-aktiv">
          <div className="fahrzeug-kasten fahrzeug-kasten-aktiv">
            <div className="fahrzeug-kasten-titel">{aktivesFahrzeug.name}</div>
            <div className="fahrzeug-kasten-flaeche fahrzeug-kasten-flaeche-aktiv">
              {aktivesFahrzeug.sitzplaetze.length === 0 && (
                <div className="fahrzeug-kasten-leer">
                  Keine Sitzplätze konfiguriert. In den Stammdaten einrichten.
                </div>
              )}
              {aktivesFahrzeug.sitzplaetze.map((s) => {
                const belegung = belegungByKey.get(`${aktivesFahrzeug.id}:${s.id}`);
                if (belegung) {
                  return (
                    <div
                      key={s.id}
                      className="sitzplatz sitzplatz-belegt"
                      style={{ left: `${s.x}%`, top: `${s.y}%` }}
                      title={`${s.bezeichnung}: ${belegung.person_name}${belegung.bemerkung ? " – " + belegung.bemerkung : ""}`}
                    >
                      <span>
                        ✓<br />
                        <span className="sitzplatz-belegt-name">{belegung.person_name}</span>
                      </span>
                    </div>
                  );
                }
                return (
                  <button
                    key={s.id}
                    type="button"
                    className="sitzplatz sitzplatz-frei"
                    style={{ left: `${s.x}%`, top: `${s.y}%` }}
                    onClick={() => sitzKlick(aktivesFahrzeug, s.id, s.bezeichnung)}
                    title={s.bezeichnung}
                  >
                    {s.bezeichnung}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ marginTop: "0.75rem" }}>
            <button className="sekundaer" onClick={() => setAktivesFahrzeugId(null)}>
              Zurück zur Übersicht
            </button>
          </div>
        </div>
      )}

      {ausgewaehlteAktion && (
        <div className="sitzplatz-scan-overlay" onClick={() => setAusgewaehlteAktion(null)}>
          <form
            onSubmit={eintragen}
            className="karte sitzplatz-scan-karte"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0 }}>
              {ausgewaehlteAktion.fahrzeug ? `${ausgewaehlteAktion.fahrzeug.name} – ` : ""}
              {ausgewaehlteAktion.bezeichnung}
            </h3>

            {qrAnsicht ? (
              <div className="sitzplatz-qr-ansicht">
                <p style={{ color: "#666" }}>
                  Mit dem Handy scannen – die Person trägt sich dort selbst für genau diesen Platz ein
                  (ohne Barcode, wird im Bericht entsprechend vermerkt).
                </p>
                <img src={qrAnsicht.bildUrl} alt="QR-Code zum Eintragen ohne Barcode" />
                <p style={{ fontSize: "0.8rem", color: "#999" }}>
                  Gültig bis {new Date(qrAnsicht.ablaufAm).toLocaleTimeString("de-DE")}
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" className="sekundaer" onClick={() => setQrAnsicht(null)}>
                    Zurück zum Scannen
                  </button>
                  <button type="button" className="sekundaer" onClick={() => setAusgewaehlteAktion(null)}>
                    Schließen
                  </button>
                </div>
              </div>
            ) : (
              <div className="sitzplatz-scan-layout">
                {vorschau && (
                  <div className="sitzplatz-scan-vorschau">
                    {vorschau.bild_url ? (
                      <img src={vorschau.bild_url} alt={vorschau.name} className="sitzplatz-scan-bild" />
                    ) : (
                      <div className="sitzplatz-scan-initialen">{initialenAus(vorschau.name)}</div>
                    )}
                    <div className="sitzplatz-scan-name">{vorschau.name}</div>
                  </div>
                )}

                <div className="sitzplatz-scan-felder">
                  <label htmlFor="ed-barcode">Barcode einscannen</label>
                  <input
                    id="ed-barcode"
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder="Barcode scannen oder eingeben"
                    autoFocus
                    required
                  />
                  <br />
                  <br />

                  {!ausgewaehlteAktion.nurGeraetehaus && !ausgewaehlteAktion.aufAnfahrt && (
                    <>
                      <label>
                        <input type="checkbox" checked={vab} onChange={(e) => setVab(e.target.checked)} /> VAB
                      </label>
                      <br />
                      <br />

                      <label>
                        <input
                          type="checkbox"
                          checked={atemschutzAktiv}
                          onChange={(e) => {
                            setAtemschutzAktiv(e.target.checked);
                            if (!e.target.checked) setAtemschutzminuten(0);
                            else if (atemschutzminuten === 0) setAtemschutzminuten(AGT_DEFAULT_MINUTEN);
                          }}
                        />{" "}
                        Atemschutz
                      </label>
                      <br />
                      <br />

                      {atemschutzAktiv && (
                        <>
                          <label htmlFor="ed-atemschutz">
                            Atemschutzminuten: <strong>{atemschutzminuten}</strong>
                          </label>
                          <input
                            id="ed-atemschutz"
                            type="range"
                            min={0}
                            max={AGT_MAX_MINUTEN}
                            step={1}
                            value={atemschutzminuten}
                            onChange={(e) => setAtemschutzminuten(Number(e.target.value))}
                            style={{ width: "100%" }}
                          />
                          <br />
                        </>
                      )}
                      <br />
                    </>
                  )}

                  <label htmlFor="ed-bemerkung">Bemerkung (optional)</label>
                  <textarea
                    id="ed-bemerkung"
                    rows={2}
                    value={bemerkung}
                    onChange={(e) => setBemerkung(e.target.value)}
                    placeholder="Notizen…"
                  />
                  <br />
                  <br />

                  {fehler && <p className="fehlertext">{fehler}</p>}
                  {qrFehler && <p className="fehlertext">{qrFehler}</p>}

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button type="submit" disabled={laeuft}>
                      {laeuft ? "Wird gespeichert…" : "Eintragen"}
                    </button>
                    <button
                      type="button"
                      className="sekundaer"
                      onClick={barcodeVergessenKlick}
                      disabled={qrLaeuft}
                    >
                      {qrLaeuft ? "Erzeuge QR-Code …" : "Barcode vergessen"}
                    </button>
                    <button type="button" className="sekundaer" onClick={() => setAusgewaehlteAktion(null)}>
                      Abbrechen
                    </button>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
