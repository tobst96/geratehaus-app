import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

/**
 * Leichtes, abhängigkeitsfreies Toast-System für **transientes** Aktions-Feedback
 * (Erfolg/Fehler/Info nach einer Aktion), das kurz einblendet und selbst wieder
 * verschwindet – als Ersatz für native `alert()`-Dialoge.
 *
 * Abgrenzung zu den bestehenden Bausteinen:
 * - `SeitenFehler` = seitenfüllender Fehlerzustand **mit „Erneut versuchen"** (Laden schlug fehl).
 * - `Fehlertext` = **inline** neben einem Formularfeld/Abschnitt.
 * - `Toast` (hier) = **flüchtige** Rückmeldung, überlagert kurz, ohne Layout zu verschieben.
 *
 * Nutzung: `const toast = useToast();` → `toast.erfolg("Gespeichert")` /
 * `toast.fehler("…")` / `toast.info("…")`.
 */

type ToastTyp = "erfolg" | "fehler" | "info";

interface ToastEintrag {
  id: number;
  nachricht: string;
  typ: ToastTyp;
}

interface ToastContextValue {
  zeige: (nachricht: string, typ?: ToastTyp) => void;
  erfolg: (nachricht: string) => void;
  fehler: (nachricht: string) => void;
  info: (nachricht: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let naechsteId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastEintrag[]>([]);

  const entfernen = useCallback((id: number) => {
    setToasts((ts) => ts.filter((t) => t.id !== id));
  }, []);

  const zeige = useCallback(
    (nachricht: string, typ: ToastTyp = "info") => {
      const id = naechsteId++;
      setToasts((ts) => [...ts, { id, nachricht, typ }]);
      // Fehler bleiben etwas länger stehen, damit sie sicher gelesen werden.
      const dauer = typ === "fehler" ? 6000 : 4000;
      window.setTimeout(() => entfernen(id), dauer);
    },
    [entfernen]
  );

  const wert: ToastContextValue = {
    zeige,
    erfolg: (n) => zeige(n, "erfolg"),
    fehler: (n) => zeige(n, "fehler"),
    info: (n) => zeige(n, "info"),
  };

  return (
    <ToastContext.Provider value={wert}>
      {children}
      <div className="toast-container">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast toast--${t.typ}`}
            role={t.typ === "fehler" ? "alert" : "status"}
          >
            <span className="toast-text">{t.nachricht}</span>
            <button
              type="button"
              className="toast-close"
              aria-label="Schließen"
              onClick={() => entfernen(t.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast muss innerhalb von <ToastProvider> verwendet werden.");
  }
  return ctx;
}
