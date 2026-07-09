import { Fehlertext } from "../../components/Fehlertext";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import QRCode from "qrcode";
import { useAuth } from "../../context/AuthContext";
import { useConfig } from "../../context/ConfigContext";
import { oeffentlicheBasisUrl } from "../../utils/oeffentlicheUrl";
import { barcodeVorschau, type BarcodeVorschau } from "../../api/auth";
import {
  holeMitgliedLoginReservierung,
  mitgliedLoginEinloesen,
  mitgliedLoginReservierungAnlegen,
} from "../../api/mitgliedLoginReservierungen";
import { ApiError } from "../../api/client";
import { BarcodeEingabe } from "../../components/BarcodeEingabe";
import {
  PersonIdentifikation,
  type PersonIdentifikationHandle,
} from "../../components/PersonIdentifikation";
import { useBarcodeSound } from "../../hooks/useBarcodeSound";
import { formatiereZeit } from "../../utils/datum";
import { texte } from "../../i18n/texte";

function initialenAus(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((teil) => teil.charAt(0))
    .join("")
    .toUpperCase();
}

export function MitgliedLogin() {
  const t = texte.mitglied_login;
  const { barcodeEinscannen, identitaetSpeichern } = useAuth();
  const { config } = useConfig();
  const barcodeModus = config?.modul_barcode_aktiv !== false;
  const navigate = useNavigate();
  const identRef = useRef<PersonIdentifikationHandle>(null);

  const [barcode, setBarcode] = useState("");
  const [vorschau, setVorschau] = useState<BarcodeVorschau | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);
  const { spieleErkannt, spieleFehler } = useBarcodeSound();

  const [qrAnsicht, setQrAnsicht] = useState<{ token: string; bildUrl: string; ablaufAm: string } | null>(
    null
  );
  const [qrFehler, setQrFehler] = useState<string | null>(null);
  const [qrLaeuft, setQrLaeuft] = useState(false);
  const [qrVorschauPerson, setQrVorschauPerson] = useState<{ name: string; bildUrl: string | null } | null>(
    null
  );

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

  async function absenden(e: FormEvent) {
    e.preventDefault();
    setLaeuft(true);
    setFehler(null);
    try {
      if (barcodeModus) {
        if (!barcode.trim()) return;
        await barcodeEinscannen(barcode.trim());
      } else {
        const name = await identRef.current!.identifiziere();
        identitaetSpeichern(name);
      }
      navigate("/mitglied");
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : t.anmeldung_fehler);
    } finally {
      setLaeuft(false);
    }
  }

  async function barcodeVergessenKlick() {
    setQrLaeuft(true);
    setQrFehler(null);
    try {
      const { token, ablauf_am } = await mitgliedLoginReservierungAnlegen();
      const url = `${oeffentlicheBasisUrl(config)}/mitglied-anmelden/${token}`;
      const bildUrl = await QRCode.toDataURL(url, { width: 280, margin: 1 });
      setQrAnsicht({ token, bildUrl, ablaufAm: ablauf_am });
    } catch (err) {
      setQrFehler(err instanceof ApiError ? String(err.detail) : t.qr_fehler);
    } finally {
      setQrLaeuft(false);
    }
  }

  // Polling: sobald auf dem Handy bestätigt wurde, hier den Namens-Cookie
  // setzen (das Handy selbst meldet nicht sich, sondern dieses Gerät an).
  useEffect(() => {
    if (!qrAnsicht) return;
    const token = qrAnsicht.token;
    let abgeschlossen = false;
    const intervall = setInterval(async () => {
      if (abgeschlossen) return;
      try {
        const info = await holeMitgliedLoginReservierung(token);
        if (info.person_name) {
          setQrVorschauPerson({ name: info.person_name, bildUrl: info.person_bild_url });
        }
        if (info.bestaetigt && !info.eingeloest) {
          abgeschlossen = true;
          await mitgliedLoginEinloesen(token);
          navigate("/mitglied");
        }
      } catch {
        // Best effort – wird beim nächsten Intervall erneut versucht.
      }
    }, 1500);
    return () => clearInterval(intervall);
  }, [qrAnsicht, navigate]);

  return (
    <div className="seite">
      <div className="karte">
        <h1>{t.titel}</h1>

        {qrAnsicht ? (
          <div className="text-center">
            <p className="text-mute">
              {t.qr_hinweis}
            </p>
            <img src={qrAnsicht.bildUrl} alt={t.qr_alt} style={{ width: 220, height: 220 }} />
            {qrVorschauPerson && (
              <div style={{ marginTop: 12 }}>
                {qrVorschauPerson.bildUrl ? (
                  <img
                    src={qrVorschauPerson.bildUrl}
                    alt={qrVorschauPerson.name}
                    style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover" }}
                  />
                ) : (
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: "50%",
                      margin: "0 auto",
                      background: "var(--farbe-primaer)",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                    }}
                  >
                    {initialenAus(qrVorschauPerson.name)}
                  </div>
                )}
                <div style={{ fontWeight: 700, marginTop: 4 }}>{qrVorschauPerson.name}</div>
              </div>
            )}
            <p className="hinweis-klein">
              {t.gueltig_bis} {formatiereZeit(qrAnsicht.ablaufAm)}
            </p>
            <button type="button" className="sekundaer" onClick={() => setQrAnsicht(null)}>
              {t.zurueck_scannen}
            </button>
          </div>
        ) : (
          <form onSubmit={absenden}>
            {barcodeModus ? (
              <>
                {vorschau && (
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    {vorschau.bild_url ? (
                      <img
                        src={vorschau.bild_url}
                        alt={vorschau.name}
                        style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover" }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 56,
                          height: 56,
                          borderRadius: "50%",
                          background: "var(--farbe-primaer)",
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700,
                        }}
                      >
                        {initialenAus(vorschau.name)}
                      </div>
                    )}
                    <strong>{vorschau.name}</strong>
                  </div>
                )}

                <div className="formular-feld">
                  <label htmlFor="ml-barcode">{t.barcode_label}</label>
                  <BarcodeEingabe
                    id="ml-barcode"
                    value={barcode}
                    onChange={setBarcode}
                    placeholder={t.barcode_platzhalter}
                    autoFocus
                    required
                  />
                </div>
              </>
            ) : (
              <div className="formular-feld">
                <PersonIdentifikation ref={identRef} autoFocus />
              </div>
            )}

            {fehler && <Fehlertext>{fehler}</Fehlertext>}
            {qrFehler && <Fehlertext>{qrFehler}</Fehlertext>}

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="submit" disabled={laeuft}>
                {laeuft ? t.anmelden_laeuft : t.anmelden}
              </button>
              {barcodeModus && (
                <button type="button" className="sekundaer" onClick={barcodeVergessenKlick} disabled={qrLaeuft}>
                  {qrLaeuft ? t.qr_erzeugen_laeuft : t.barcode_vergessen}
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
