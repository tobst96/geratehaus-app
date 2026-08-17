import { useEffect, useState } from "react";

/** Chromium feuert vor der Installation ein `beforeinstallprompt`-Event, das wir
 * abfangen und über einen eigenen Button auslösen. iOS/Safari kennt das nicht →
 * dort zeigen wir stattdessen die manuelle Anleitung. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function istStandalone(): boolean {
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches === true ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function istIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function InstallPrompt() {
  const [ereignis, setEreignis] = useState<BeforeInstallPromptEvent | null>(null);
  const [versteckt, setVersteckt] = useState(istStandalone());
  const [iosHinweis, setIosHinweis] = useState(false);

  useEffect(() => {
    if (istStandalone()) return;
    const handler = (e: Event) => {
      // Verhindert den Standard-Mini-Infobar, damit wir den Button selbst platzieren.
      e.preventDefault();
      setEreignis(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    if (istIos()) setIosHinweis(true);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function installieren() {
    if (!ereignis) return;
    await ereignis.prompt();
    const { outcome } = await ereignis.userChoice;
    if (outcome === "accepted") setVersteckt(true);
    setEreignis(null);
  }

  if (versteckt) return null;

  if (ereignis) {
    return (
      <div className="karte" style={{ marginBottom: 16, textAlign: "center" }}>
        <p style={{ margin: "0 0 8px" }}>
          Installiere die App auf deinem Gerät – schneller Zugriff im Vollbild und Push-Benachrichtigungen.
        </p>
        <button type="button" onClick={installieren}>
          App installieren
        </button>
      </div>
    );
  }

  if (iosHinweis) {
    return (
      <div className="karte" style={{ marginBottom: 16 }}>
        <p style={{ margin: 0, color: "var(--farbe-text-mute)", fontSize: "0.9rem" }}>
          📲 Tipp: Tippe unten auf <strong>Teilen</strong> und dann auf{" "}
          <strong>„Zum Home-Bildschirm"</strong>, um die App zu installieren.
        </p>
      </div>
    );
  }

  return null;
}
