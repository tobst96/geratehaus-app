import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";

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
    const reader = new BrowserMultiFormatReader();
    let abgebrochen = false;
    let controls: { stop: () => void } | undefined;

    reader
      .decodeFromVideoDevice(undefined, videoRef.current!, (ergebnis) => {
        if (ergebnis && !abgebrochen) {
          abgebrochen = true;
          controls?.stop();
          onScan(ergebnis.getText());
        }
      })
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
        style={{ background: "#fff", borderRadius: 16, padding: "1rem", maxWidth: 480, width: "100%" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ marginTop: 0 }}>Barcode scannen</h3>
        {fehler && <p className="fehlertext">{fehler}</p>}
        <video ref={videoRef} style={{ width: "100%", borderRadius: 8, background: "#000" }} muted />
        <button type="button" className="sekundaer" style={{ marginTop: "1rem" }} onClick={onClose}>
          Abbrechen
        </button>
      </div>
    </div>
  );
}
