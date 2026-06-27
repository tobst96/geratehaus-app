import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";

interface BarcodeScannerProps {
  onScan: (wert: string) => void;
  onClose: () => void;
}

/** Vollbild-Overlay mit Kamera-Live-Bild zum Scannen eines Code128-Barcodes
 * (Format der von dieser App erzeugten Personen-Barcodes). Schließt sich
 * automatisch, sobald ein Code erkannt wurde. */
export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [fehler, setFehler] = useState<string | null>(null);

  useEffect(() => {
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.CODE_128]);
    hints.set(DecodeHintType.TRY_HARDER, true);
    const reader = new BrowserMultiFormatReader(hints);
    let abgebrochen = false;
    let controls: { stop: () => void } | undefined;

    reader
      .decodeFromConstraints(
        { video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } } },
        videoRef.current!,
        (ergebnis) => {
          if (ergebnis && !abgebrochen) {
            abgebrochen = true;
            controls?.stop();
            onScan(ergebnis.getText());
          }
        }
      )
      .then((c) => {
        controls = c;
      })
      .catch(() => {
        setFehler("Kamera konnte nicht gestartet werden. Bitte Kamera-Zugriff erlauben.");
      });

    return () => {
      abgebrochen = true;
      controls?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.85)",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
      onClick={onClose}
    >
      <div
        style={{ background: "var(--farbe-oberflaeche)", borderRadius: 16, padding: "1rem", maxWidth: 480, width: "100%" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ marginTop: 0 }}>Barcode scannen</h3>
        {fehler && <p className="fehlertext">{fehler}</p>}
        <div style={{ position: "relative" }}>
          <video ref={videoRef} style={{ width: "100%", borderRadius: 8, background: "#000", display: "block" }} muted />
          <div style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}>
            <div style={{
              width: "80%",
              height: 64,
              border: "3px solid rgba(255,255,255,0.8)",
              borderRadius: 8,
              boxShadow: "0 0 0 9999px rgba(0,0,0,0.35)",
            }} />
          </div>
        </div>
        <p style={{ fontSize: "0.82rem", color: "var(--farbe-text-mute)", margin: "0.5rem 0 0" }}>
          Barcode in den Rahmen halten
        </p>
        <button type="button" className="sekundaer" style={{ marginTop: "1rem" }} onClick={onClose}>
          Abbrechen
        </button>
      </div>
    </div>
  );
}
