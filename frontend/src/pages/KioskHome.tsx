import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./KioskHome.css";

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

type ActionKey = "einsatzbericht" | "dienstbuch" | "dienststunden";

const ACTIONS: Record<
  ActionKey,
  { label: string; route: string; tileClass: string; icon: JSX.Element }
> = {
  einsatzbericht: {
    label: "Einsatzbericht",
    route: "/einsatztagebuch",
    tileClass: "kiosk-tile-red",
    icon: (
      <svg className="kiosk-tile-icon" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M32 6c-9.94 0-18 8.06-18 18v14H16a4 4 0 0 0 0 8h32a4 4 0 0 0 0-8h-2V24c0-9.94-8.06-18-18-18Z"
          fill="white"
          fillOpacity="0.95"
        />
        <rect x="29" y="2" width="6" height="8" rx="2" fill="white" />
        <circle cx="32" cy="50" r="6" fill="white" />
        <path d="M32 16v14M25 23l14 14" stroke="#e63950" strokeWidth="3" strokeLinecap="round" />
      </svg>
    ),
  },
  dienstbuch: {
    label: "Dienstbuch",
    route: "/dienstbuch",
    tileClass: "kiosk-tile-blue",
    icon: (
      <svg className="kiosk-tile-icon" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M10 12a4 4 0 0 1 4-4h16v48H14a4 4 0 0 1-4-4V12Z"
          fill="white"
          fillOpacity="0.95"
        />
        <path
          d="M54 12a4 4 0 0 0-4-4H34v48h16a4 4 0 0 0 4-4V12Z"
          fill="white"
          fillOpacity="0.75"
        />
        <path d="M32 8v48" stroke="#2563eb" strokeWidth="2" />
        <path d="M16 18h10M16 26h10M16 34h10" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M38 18h10M38 26h10M38 34h10" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
      </svg>
    ),
  },
  dienststunden: {
    label: "Dienststunden",
    route: "/dienststunden",
    tileClass: "kiosk-tile-green",
    icon: (
      <svg className="kiosk-tile-icon" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="32" cy="34" r="24" fill="white" fillOpacity="0.95" />
        <path d="M24 6h16" stroke="white" strokeWidth="4" strokeLinecap="round" />
        <path d="M32 18v16l11 7" stroke="#0f9b6e" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
};

const SCAN_ICON = (
  <svg className="kiosk-scan-icon" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="6" y="14" width="6" height="36" rx="1.5" fill="white" />
    <rect x="16" y="14" width="3" height="36" rx="1.5" fill="white" />
    <rect x="23" y="14" width="6" height="36" rx="1.5" fill="white" />
    <rect x="33" y="14" width="3" height="36" rx="1.5" fill="white" />
    <rect x="40" y="14" width="6" height="36" rx="1.5" fill="white" />
    <rect x="50" y="14" width="8" height="36" rx="1.5" fill="white" />
  </svg>
);

const SUCCESS_ICON = (
  <svg className="kiosk-scan-success-icon" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="32" r="30" fill="#34e89e" />
    <path d="M20 33l8 8 16-18" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export function KioskHome() {
  const navigate = useNavigate();
  const [selectedAction, setSelectedAction] = useState<ActionKey | null>(null);
  const [barcode, setBarcode] = useState("");
  const [scanSuccessful, setScanSuccessful] = useState(false);
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());

  function resetToTiles() {
    setSelectedAction(null);
    setBarcode("");
    setScanSuccessful(false);
  }

  // Reset inactivity timer on any activity
  useEffect(() => {
    const handleActivity = () => setLastActivityTime(Date.now());
    window.addEventListener("click", handleActivity);
    window.addEventListener("keypress", handleActivity);
    return () => {
      window.removeEventListener("click", handleActivity);
      window.removeEventListener("keypress", handleActivity);
    };
  }, []);

  // Check for inactivity timeout
  useEffect(() => {
    const interval = setInterval(() => {
      if (Date.now() - lastActivityTime > INACTIVITY_TIMEOUT_MS) {
        resetToTiles();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [lastActivityTime]);

  // Auto-focus barcode input
  useEffect(() => {
    if (selectedAction && !scanSuccessful) {
      const input = document.getElementById("barcode-input") as HTMLInputElement;
      if (input) input.focus();
    }
  }, [selectedAction, scanSuccessful]);

  function handleBarcodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!barcode.trim() || !selectedAction) return;
    setScanSuccessful(true);
    sessionStorage.setItem("current_barcode", barcode);
    const route = ACTIONS[selectedAction].route;
    setTimeout(() => {
      navigate(route);
    }, 900);
  }

  // Tile selection screen (default view)
  if (!selectedAction) {
    return (
      <div className="kiosk-container">
        <h1 className="kiosk-title">Gerätehaus.app</h1>
        <p className="kiosk-subtitle">Was möchtest du machen?</p>

        <div className="kiosk-grid">
          {(Object.keys(ACTIONS) as ActionKey[]).map((key) => {
            const action = ACTIONS[key];
            return (
              <button
                key={key}
                className={`kiosk-tile ${action.tileClass}`}
                onClick={() => setSelectedAction(key)}
              >
                {action.icon}
                <div className="kiosk-tile-text">{action.label}</div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Barcode scan screen for selected action
  return (
    <div className="kiosk-container">
      <h1 className="kiosk-title">Gerätehaus.app</h1>

      <div className="kiosk-scan-card">
        {scanSuccessful ? (
          <div className="kiosk-scan-success">
            {SUCCESS_ICON}
            <div className="kiosk-scan-success-text">Erkannt!</div>
          </div>
        ) : (
          <>
            {SCAN_ICON}
            <div className="kiosk-scan-action">{ACTIONS[selectedAction].label}</div>
            <form onSubmit={handleBarcodeSubmit} className="kiosk-form">
              <input
                id="barcode-input"
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Barcode scannen oder eingeben"
                className="kiosk-input"
                autoFocus
              />
              <button type="submit" className="kiosk-submit-btn" disabled={!barcode.trim()}>
                Einlesen
              </button>
            </form>
          </>
        )}
      </div>

      {!scanSuccessful && (
        <button className="kiosk-back-btn" onClick={resetToTiles}>
          Zurück
        </button>
      )}
    </div>
  );
}
