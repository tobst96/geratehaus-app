import { createContext, useContext } from "react";

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
 *
 * Der Context selbst lebt in dieser Datei ohne Komponenten-Export, die
 * Provider-Komponente in ToastProvider.tsx – sonst bricht Fast Refresh
 * (react-refresh/only-export-components), weil die Datei sowohl eine
 * Komponente als auch Nicht-Komponenten-Werte (Context, Hook) exportieren würde.
 */

export type ToastTyp = "erfolg" | "fehler" | "info";

interface ToastContextValue {
  zeige: (nachricht: string, typ?: ToastTyp) => void;
  erfolg: (nachricht: string) => void;
  fehler: (nachricht: string) => void;
  info: (nachricht: string) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast muss innerhalb von <ToastProvider> verwendet werden.");
  }
  return ctx;
}
