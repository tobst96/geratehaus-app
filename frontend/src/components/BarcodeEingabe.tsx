import { useState, type InputHTMLAttributes } from "react";
import { BarcodeScanner } from "./BarcodeScanner";

interface BarcodeEingabeProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  value: string;
  onChange: (wert: string) => void;
}

/** Text-Eingabefeld für Barcodes mit Kamera-Symbol daneben, das einen
 * Live-Scanner öffnet (siehe BarcodeScanner). Übernimmt alle Standard-Input-
 * Props per Spread, damit bestehende Felder 1:1 ersetzt werden können. */
export function BarcodeEingabe({ value, onChange, ...rest }: BarcodeEingabeProps) {
  const [scannerOffen, setScannerOffen] = useState(false);

  return (
    <>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input value={value} onChange={(e) => onChange(e.target.value)} {...rest} style={{ flex: 1 }} />
        <button
          type="button"
          className="sekundaer"
          title="Mit Kamera scannen"
          aria-label="Mit Kamera scannen"
          onClick={() => setScannerOffen(true)}
          style={{ flexShrink: 0, padding: "0.5rem 0.7rem" }}
        >
          📷
        </button>
      </div>
      {scannerOffen && (
        <BarcodeScanner
          onScan={(wert) => {
            setScannerOffen(false);
            onChange(wert);
          }}
          onClose={() => setScannerOffen(false)}
        />
      )}
    </>
  );
}
