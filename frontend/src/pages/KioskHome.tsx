import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export function KioskHome() {
  const navigate = useNavigate();
  const [barcode, setBarcode] = useState("");
  const [scanSuccessful, setScanSuccessful] = useState(false);
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());

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
        setScanSuccessful(false);
        setBarcode("");
        navigate("/");
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [lastActivityTime, navigate]);

  // Auto-focus barcode input
  useEffect(() => {
    const input = document.getElementById("barcode-input") as HTMLInputElement;
    if (input) input.focus();
  }, [scanSuccessful]);

  function handleBarcodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (barcode.trim()) {
      setScanSuccessful(true);
      // Store barcode for later use
      sessionStorage.setItem("current_barcode", barcode);
      // Auto-clear after a moment
      setTimeout(() => {
        setScanSuccessful(false);
        setBarcode("");
      }, 2000);
    }
  }

  // Barcode scan screen
  if (!scanSuccessful) {
    return (
      <div style={styles.container}>
        <h1 style={styles.title}>Gerätehaus.app</h1>
        <p style={styles.subtitle}>Barcode einscannen</p>
        <form onSubmit={handleBarcodeSubmit} style={styles.form}>
          <input
            id="barcode-input"
            type="text"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            placeholder="Barcode scannen oder eingeben"
            style={styles.input}
            autoFocus
          />
          <button type="submit" style={styles.submitBtn} disabled={!barcode.trim()}>
            Einlesen
          </button>
        </form>
      </div>
    );
  }

  // Main kiosk menu - after barcode scanned
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Gerätehaus.app</h1>
      <p style={styles.subtitle}>Was möchtest du machen?</p>

      <div style={styles.buttonGrid}>
        <button
          style={{ ...styles.largeButton, ...styles.redButton }}
          onClick={() => navigate("/einsatztagebuch")}
        >
          <div style={styles.buttonEmoji}>🚨</div>
          <div style={styles.buttonText}>Einsatzbericht</div>
        </button>

        <button
          style={{ ...styles.largeButton, ...styles.blueButton }}
          onClick={() => navigate("/dienstbuch")}
        >
          <div style={styles.buttonEmoji}>📋</div>
          <div style={styles.buttonText}>Dienstbuch</div>
        </button>

        <button
          style={{ ...styles.largeButton, ...styles.greenButton }}
          onClick={() => navigate("/dienststunden")}
        >
          <div style={styles.buttonEmoji}>⏱️</div>
          <div style={styles.buttonText}>Dienststunden</div>
        </button>
      </div>

      <button
        style={styles.logoutBtn}
        onClick={() => {
          setScanSuccessful(false);
          setBarcode("");
        }}
      >
        Zurück
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    padding: "1rem",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    fontFamily: '"Segoe UI", Roboto, sans-serif',
  },
  title: {
    fontSize: "4rem",
    fontWeight: "900",
    marginBottom: "0.5rem",
    textAlign: "center",
    color: "white",
    textShadow: "0 2px 10px rgba(0, 0, 0, 0.3)",
  },
  subtitle: {
    fontSize: "1.8rem",
    color: "rgba(255, 255, 255, 0.9)",
    marginBottom: "4rem",
    textAlign: "center",
    fontWeight: "300",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    width: "100%",
    maxWidth: "500px",
    marginBottom: "2rem",
  },
  input: {
    padding: "1.5rem",
    fontSize: "1.5rem",
    border: "none",
    borderRadius: "16px",
    width: "100%",
    boxShadow: "0 8px 16px rgba(0, 0, 0, 0.2)",
  },
  submitBtn: {
    padding: "1.5rem 3rem",
    fontSize: "1.3rem",
    backgroundColor: "white",
    color: "#667eea",
    border: "none",
    borderRadius: "16px",
    cursor: "pointer",
    fontWeight: "bold",
    boxShadow: "0 8px 16px rgba(0, 0, 0, 0.2)",
    transition: "all 0.3s ease",
  },
  buttonGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "3rem",
    width: "100%",
    maxWidth: "1200px",
    marginBottom: "3rem",
  },
  largeButton: {
    padding: "4rem 2rem",
    color: "white",
    border: "none",
    borderRadius: "24px",
    cursor: "pointer",
    fontWeight: "bold",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "350px",
    boxShadow: "0 15px 35px rgba(0, 0, 0, 0.2)",
    transition: "all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
    fontSize: "1.3rem",
  },
  buttonEmoji: {
    fontSize: "120px",
    marginBottom: "1.5rem",
    display: "block",
  },
  buttonText: {
    fontSize: "2rem",
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: "0.5px",
  },
  redButton: {
    background: "linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)",
  },
  blueButton: {
    background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  },
  greenButton: {
    background: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  },
  logoutBtn: {
    padding: "1rem 2rem",
    fontSize: "1rem",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    color: "white",
    border: "2px solid white",
    borderRadius: "12px",
    cursor: "pointer",
    fontWeight: "600",
    transition: "all 0.3s ease",
  },
};
