import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useConfig } from "../context/ConfigContext";

/**
 * Kiosk-Auto-Sperre: springt nach `kiosk_autolock_sekunden` Inaktivität zurück
 * zur Kiosk-Startseite (`/kiosk/<token>`) und verhindert so hängende Sitzungen
 * mit gewählter Person. Nur aktiv auf einem Kiosk-Tablet (localStorage
 * `kiosk_token` gesetzt) und wenn die Schwelle > 0 ist. Jede Nutzer-Interaktion
 * (Klick/Taste/Touch/Scroll) und jeder Seitenwechsel setzt den Timer zurück.
 */
export function useKioskAutolock() {
  const { config } = useConfig();
  const navigate = useNavigate();
  const location = useLocation();
  const timer = useRef<number | null>(null);
  const sekunden = config?.kiosk_autolock_sekunden ?? 0;

  useEffect(() => {
    const kioskToken = localStorage.getItem("kiosk_token");
    if (!kioskToken || sekunden <= 0) return;

    const ziel = `/kiosk/${kioskToken}`;

    const reset = () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        // Nicht zurückspringen, wenn wir schon auf der Kiosk-Startseite sind.
        if (window.location.pathname !== ziel) navigate(ziel);
      }, sekunden * 1000);
    };

    const events = ["mousedown", "keydown", "touchstart", "pointerdown", "wheel"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();

    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [sekunden, location.pathname, navigate]);
}
