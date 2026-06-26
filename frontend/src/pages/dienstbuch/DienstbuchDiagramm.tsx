import { useEffect, useRef, useState, type FormEvent } from "react";
import QRCode from "qrcode";
import {
  dienstbuchReservierungAnlegen,
  teilnehmerAktualisieren,
  teilnehmerEintragen,
} from "../../api/dienstbuecher";
import { holeDienstbuchReservierung } from "../../api/dienstbuchReservierungen";
import { barcodeVorschau, type BarcodeVorschau } from "../../api/auth";
import { ApiError } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useConfig } from "../../context/ConfigContext";
import { oeffentlicheBasisUrl } from "../../utils/oeffentlicheUrl";
import { BarcodeEingabe } from "../../components/BarcodeEingabe";
import { useMitgliedModus } from "../../hooks/useMitgliedModus";
import type { DienstbuchOut, Gruppe, TeilnehmerOut } from "../../api/types";
import "./DienstbuchDiagramm.css";

function initialenAus(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((teil) => teil.charAt(0))
    .join("")
    .toUpperCase();
}

interface DienstbuchDiagrammProps {
  dienstbuch: DienstbuchOut;
  gruppen: Gruppe[];
  onAktualisiert: () => Promise<void>;
  onCancel: () => void;
}

const AGT_MAX_MINUTEN = 35;
const AGT_DEFAULT_MINUTEN = 30;

export function DienstbuchDiagramm({ dienstbuch, gruppen, onAktualisiert, onCancel }: DienstbuchDiagrammProps) {
  const { barcodeEinscannen } = useAuth();
  const { config } = useConfig();
  const mitgliedModus = useMitgliedModus();
  const [barcode, setBarcode] = useState("");
  const [vorschau, setVorschau] = useState<BarcodeVorschau | null>(null);
  const [gruppeId, setGruppeId] = useState<number | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
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

  const letzteVorschauName = useRef<string | null>(null);

  // Live-Vorschau (Name + Bild) während des Scannens, debounced, damit nicht
  // bei jedem Tastendruck ein Request raus geht.
  useEffect(() => {
    const wert = barcode.trim();
    if (!wert) {
      setVorschau(null);
      letzteVorschauName.current = null;
      return;
    }
    const timeout = setTimeout(() => {
      barcodeVorschau(wert)
        .then((ergebnis) => {
          setVorschau(ergebnis);
          // Gruppe nur beim erstmaligen Auflösen einer Person vorschlagen,
          // damit eine manuelle Änderung nicht bei jedem Debounce überschrieben wird.
          if (letzteVorschauName.current !== ergebnis.name) {
            letzteVorschauName.current = ergebnis.name;
            setGruppeId(ergebnis.gruppe_id);
          }
        })
        .catch(() => {
          setVorschau(null);
          letzteVorschauName.current = null;
        });
    }, 250);
    return () => clearTimeout(timeout);
  }, [barcode]);

  function zuruecksetzen() {
    setBarcode("");
    setVorschau(null);
    setGruppeId(null);
    letzteVorschauName.current = null;
  }

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
      const { token, ablauf_am } = await dienstbuchReservierungAnlegen(dienstbuch.id);
      const url = `${oeffentlicheBasisUrl(config)}/eintragen-dienstbuch/${token}`;
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
  // (Name+Bild) muss mindestens 3 Sekunden sichtbar bleiben, bevor der
  // Dialog nach erfolgter Eintragung automatisch schließt.
  useEffect(() => {
    if (!qrAnsicht) return;
    const token = qrAnsicht.token;
    const intervall = setInterval(async () => {
      try {
        const info = await holeDienstbuchReservierung(token);
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
            await onAktualisiert();
            qrAnsichtZuruecksetzen();
          }, wartenMs);
        }
      } catch {
        // Best effort – wird beim nächsten Intervall erneut versucht.
      }
    }, 1500);
    return () => clearInterval(intervall);
  }, [qrAnsicht, onAktualisiert]);

  async function eintragen(e: FormEvent) {
    e.preventDefault();
    if (!mitgliedModus.aktiv && !barcode.trim()) {
      setFehler("Barcode erforderlich");
      return;
    }
    setLaeuft(true);
    setFehler(null);
    try {
      if (!mitgliedModus.aktiv) {
        await barcodeEinscannen(barcode.trim());
      }
      await teilnehmerEintragen(dienstbuch.id, {
        gruppe_id: gruppeId,
        // Atemschutzminuten stehen erst nach dem Dienst fest und werden
        // daher nicht beim Scannen abgefragt, sondern später in der Liste nachgetragen.
        atemschutzminuten: 0,
      });
      await onAktualisiert();
      zuruecksetzen();
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Eintragung fehlgeschlagen.");
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <div>
      <div className="dienstbuch-diagramm-kopf">
        <h2 style={{ margin: 0 }}>{dienstbuch.titel}</h2>
        <button className="sekundaer" onClick={onCancel}>
          Zurück
        </button>
      </div>

      <div className="dienstbuch-diagramm-layout">
        <div className="dienstbuch-diagramm-spalte">
          <div className="karte">
            <h3 style={{ marginTop: 0 }}>Dienstbuchdetails</h3>
            <p>Eröffnet am: {new Date(dienstbuch.eroeffnet_am).toLocaleString("de-DE")}</p>
            {dienstbuch.notizen && <p>{dienstbuch.notizen}</p>}
            <p>{dienstbuch.teilnehmer.length} Teilnehmer</p>
          </div>
        </div>

        <div className="dienstbuch-diagramm-spalte">
          <form onSubmit={eintragen} className="karte dienstbuch-scan-karte">
            <h3 style={{ marginTop: 0 }}>Barcode scannen</h3>

            {qrAnsicht ? (
              <div className="dienstbuch-qr-ansicht">
                <p style={{ color: "#666" }}>
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
                    className="dienstbuch-qr-bild"
                  />
                  {qrVorschauPerson && (
                    <div className="dienstbuch-scan-vorschau">
                      {qrVorschauPerson.bildUrl ? (
                        <img
                          src={qrVorschauPerson.bildUrl}
                          alt={qrVorschauPerson.name}
                          className="dienstbuch-scan-bild"
                        />
                      ) : (
                        <div className="dienstbuch-scan-initialen">{initialenAus(qrVorschauPerson.name)}</div>
                      )}
                      <div className="dienstbuch-scan-name">{qrVorschauPerson.name}</div>
                    </div>
                  )}
                </div>
                <p style={{ fontSize: "0.8rem", color: "#999" }}>
                  Gültig bis {new Date(qrAnsicht.ablaufAm).toLocaleTimeString("de-DE")}
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" className="sekundaer" onClick={qrAnsichtZuruecksetzen}>
                    Zurück zum Scannen
                  </button>
                </div>
              </div>
            ) : (
              <div className="dienstbuch-scan-layout">
                {!mitgliedModus.aktiv && vorschau && (
                  <div className="dienstbuch-scan-vorschau">
                    {vorschau.bild_url ? (
                      <img src={vorschau.bild_url} alt={vorschau.name} className="dienstbuch-scan-bild" />
                    ) : (
                      <div className="dienstbuch-scan-initialen">{initialenAus(vorschau.name)}</div>
                    )}
                    <div className="dienstbuch-scan-name">{vorschau.name}</div>
                  </div>
                )}

                <div className="dienstbuch-scan-felder">
                  {mitgliedModus.aktiv ? (
                    <p style={{ color: "#666" }}>
                      Eingeloggt als <strong>{mitgliedModus.name}</strong>
                    </p>
                  ) : (
                    <>
                      <label htmlFor="db-barcode">Barcode einscannen</label>
                      <BarcodeEingabe
                        id="db-barcode"
                        type="text"
                        value={barcode}
                        onChange={setBarcode}
                        placeholder="Barcode scannen oder eingeben"
                        autoFocus
                        required
                      />
                      <br />
                      <br />
                    </>
                  )}

                  <label htmlFor="db-gruppe">Gruppe</label>
                  <select
                    id="db-gruppe"
                    value={gruppeId ?? ""}
                    onChange={(e) => setGruppeId(e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">– keine –</option>
                    {gruppen.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                  <br />
                  <br />

                  {fehler && <p className="fehlertext">{fehler}</p>}
                  {qrFehler && <p className="fehlertext">{qrFehler}</p>}

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button type="submit" disabled={laeuft}>
                      {laeuft ? "Wird gespeichert…" : "Eintragen"}
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
            )}
          </form>

          <div className="karte">
            <h3 style={{ marginTop: 0 }}>Teilnehmer ({dienstbuch.teilnehmer.length})</h3>
            {dienstbuch.teilnehmer.length === 0 && <p style={{ color: "#999" }}>Noch niemand eingetragen.</p>}
            <ul className="dienstbuch-teilnehmer-liste">
              {dienstbuch.teilnehmer.map((t) => (
                <TeilnehmerZeile
                  key={t.id}
                  teilnehmer={t}
                  dienstbuchId={dienstbuch.id}
                  onAktualisiert={onAktualisiert}
                />
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

interface TeilnehmerZeileProps {
  teilnehmer: TeilnehmerOut;
  dienstbuchId: number;
  onAktualisiert: () => Promise<void>;
}

function TeilnehmerZeile({ teilnehmer, dienstbuchId, onAktualisiert }: TeilnehmerZeileProps) {
  const [minuten, setMinuten] = useState(teilnehmer.atemschutzminuten);

  useEffect(() => {
    setMinuten(teilnehmer.atemschutzminuten);
  }, [teilnehmer.atemschutzminuten]);

  async function speichern(wert: number) {
    setMinuten(wert);
    await teilnehmerAktualisieren(dienstbuchId, teilnehmer.id, { atemschutzminuten: wert });
    await onAktualisiert();
  }

  return (
    <li>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <strong>{teilnehmer.person_name}</strong>
        {teilnehmer.gruppe_name ? <span>{teilnehmer.gruppe_name}</span> : null}
        <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <input
            type="checkbox"
            checked={minuten > 0}
            onChange={(e) => speichern(e.target.checked ? AGT_DEFAULT_MINUTEN : 0)}
          />{" "}
          Atemschutz
        </label>
      </div>
      {minuten > 0 && (
        <div style={{ marginTop: 4 }}>
          <label>
            Atemschutzminuten: <strong>{minuten}</strong>
          </label>
          <input
            type="range"
            min={0}
            max={AGT_MAX_MINUTEN}
            step={1}
            value={minuten}
            onChange={(e) => setMinuten(Number(e.target.value))}
            onMouseUp={(e) => speichern(Number((e.target as HTMLInputElement).value))}
            onTouchEnd={(e) => speichern(Number((e.target as HTMLInputElement).value))}
            onKeyUp={(e) => speichern(Number((e.target as HTMLInputElement).value))}
            style={{ width: "100%" }}
          />
        </div>
      )}
    </li>
  );
}
