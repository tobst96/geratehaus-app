import { createContext, useContext } from "react";
import type { Gruppenfuehrer2FAEinrichtenErgebnis } from "../api/auth";

interface AuthContextValue {
  angezeigterName: string | null;
  barcodeEinscannen: (token: string) => Promise<string>;
  barcodeEinscannenEinmalig: (token: string) => Promise<{ name: string; ohnePin: boolean }>;
  nameLoginEinmalig: (personId: number, pin: string) => Promise<{ name: string; ohnePin: boolean }>;
  /** Merkt eine bereits serverseitig gesetzte Identität lokal (Anzeige/Persistenz),
   * z. B. nach einem Namen+PIN-Login im Mitgliederbereich. */
  identitaetSpeichern: (name: string) => void;
  kioskScanBeenden: () => Promise<void>;
  gruppenfuehrerAngemeldet: boolean;
  gruppenfuehrerRolle: string | null;
  /** True, sobald die eigenen Modul-Rechte geladen wurden (Guards warten darauf). */
  berechtigungenGeladen: boolean;
  /** Ob der angemeldete Gruppenführer auf ein Modul zugreifen darf (Admin: immer true). */
  hatModulZugriff: (modulKey: string) => boolean;
  /** Wechsel in den Gruppenführer-/Admin-Bereich für eine bereits per
   * Namens-Cookie identifizierte Person – kein erneutes Passwort nötig. */
  gruppenfuehrerStepUp: () => Promise<{
    zweiFaktorErforderlich: boolean;
    einrichtungErforderlich: boolean;
    emailGesetzt: boolean;
    challenge: string | null;
  }>;
  /** Pflicht-2FA: aktiviert 2FA im Login-Fluss und liefert Recovery-Codes +
   * neuen Challenge für den anschließenden Code-Schritt. */
  gruppenfuehrer2faEinrichten: (
    challenge: string,
    email?: string
  ) => Promise<Gruppenfuehrer2FAEinrichtenErgebnis>;
  gruppenfuehrer2faAbschliessen: (
    challenge: string,
    code: string,
    angemeldetBleiben: boolean
  ) => Promise<void>;
  gruppenfuehrerAbmelden: () => void;
  mitgliedAbmelden: () => Promise<void>;
}

// Der Context selbst lebt in dieser Datei ohne Komponenten-Export, die
// Provider-Komponente in AuthProvider.tsx – sonst bricht Fast Refresh
// (react-refresh/only-export-components), weil die Datei sowohl eine
// Komponente als auch Nicht-Komponenten-Werte (Context, Hook) exportieren würde.
export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth muss innerhalb von AuthProvider verwendet werden.");
  }
  return context;
}
