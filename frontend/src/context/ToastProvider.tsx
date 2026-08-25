import { useCallback, useState, type ReactNode } from "react";
import { ToastContext, type ToastTyp } from "./ToastContext";

interface ToastEintrag {
  id: number;
  nachricht: string;
  typ: ToastTyp;
}

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

  const wert = {
    zeige,
    erfolg: (n: string) => zeige(n, "erfolg"),
    fehler: (n: string) => zeige(n, "fehler"),
    info: (n: string) => zeige(n, "info"),
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
