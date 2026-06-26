import { useEffect, useState, type FormEvent } from "react";
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
  const { barcodeEinscannen } = useAuth();
  const { config } = useConfig();
  const navigate = useNavigate();

  const [barcode, setBarcode] = useState("");
  const [vorschau, setVorschau] = useState<BarcodeVorschau | null>(null);
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

  useEffect(() => {
    const wert = barcode.trim();
    if (!wert) {
      setVorschau(null);
      return;
    }
    const timeout = setTimeout(() => {
      barcodeVorschau(wert).then(setVorschau).catch(() => setVorschau(null));
    }, 250);
    return () => clearTimeout(timeout);
  }, [barcode]);

  async function absenden(e: FormEvent) {
    e.preventDefault();
    if (!barcode.trim()) return;
    setLaeuft(true);
    setFehler(null);
    try {
      await barcodeEinscannen(barcode.trim());
      navigate("/mitglied");
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Anmeldung fehlgeschlagen.");
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
      setQrFehler(err instanceof ApiError ? String(err.detail) : "QR-Code konnte nicht erzeugt werden.");
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
        <h1>Mitglieder-Login</h1>

        {qrAnsicht ? (
          <div style={{ textAlign: "center" }}>
            <p style={{ color: "#666" }}>
              Mit dem Handy scannen und dich dort auswählen – dieses Gerät meldet sich danach automatisch an.
            </p>
            <img src={qrAnsicht.bildUrl} alt="QR-Code für Login ohne Barcode" style={{ width: 220, height: 220 }} />
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
            <p style={{ fontSize: "0.8rem", color: "#999" }}>
              Gültig bis {new Date(qrAnsicht.ablaufAm).toLocaleTimeString("de-DE")}
            </p>
            <button type="button" className="sekundaer" onClick={() => setQrAnsicht(null)}>
              Zurück zum Scannen
            </button>
          </div>
        ) : (
          <form onSubmit={absenden}>
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

            <label htmlFor="ml-barcode">Barcode einscannen</label>
            <input
              id="ml-barcode"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="Barcode scannen oder eingeben"
              autoFocus
              required
            />
            <br />
            <br />

            {fehler && <p className="fehlertext">{fehler}</p>}
            {qrFehler && <p className="fehlertext">{qrFehler}</p>}

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="submit" disabled={laeuft}>
                {laeuft ? "Wird angemeldet…" : "Anmelden"}
              </button>
              <button type="button" className="sekundaer" onClick={barcodeVergessenKlick} disabled={qrLaeuft}>
                {qrLaeuft ? "Erzeuge QR-Code …" : "Barcode vergessen"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
