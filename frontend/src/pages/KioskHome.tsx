import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

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
          style={{ ...styles.largeButton, backgroundColor: "#d32f2f" }}
          onClick={() => navigate("/einsatztagebuch")}
        >
          🚨
          <br />
          Einsatzbericht
        </button>

        <button
          style={{ ...styles.largeButton, backgroundColor: "#1976d2" }}
          onClick={() => navigate("/dienstbuch")}
        >
          📋
          <br />
          Dienstbuch
        </button>

        <button
          style={{ ...styles.largeButton, backgroundColor: "#388e3c" }}
          onClick={() => navigate("/dienststunden")}
        >
          ⏱️
          <br />
          Dienststunden
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
    padding: "2rem",
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: "3rem",
    marginBottom: "1rem",
    textAlign: "center",
  },
  subtitle: {
    fontSize: "1.5rem",
    color: "#666",
    marginBottom: "2rem",
    textAlign: "center",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    width: "100%",
    maxWidth: "400px",
    marginBottom: "2rem",
  },
  input: {
    padding: "1rem",
    fontSize: "1.2rem",
    border: "2px solid #ddd",
    borderRadius: "8px",
    width: "100%",
  },
  submitBtn: {
    padding: "1rem 2rem",
    fontSize: "1.2rem",
    backgroundColor: "#1976d2",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  buttonGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "2rem",
    width: "100%",
    maxWidth: "800px",
    marginBottom: "2rem",
  },
  largeButton: {
    padding: "3rem 2rem",
    fontSize: "2rem",
    color: "white",
    border: "none",
    borderRadius: "12px",
    cursor: "pointer",
    fontWeight: "bold",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "200px",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
    transition: "transform 0.2s",
  },
  logoutBtn: {
    padding: "0.75rem 1.5rem",
    fontSize: "1rem",
    backgroundColor: "#999",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
};
