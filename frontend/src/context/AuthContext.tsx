import { createContext, useContext, useState, type ReactNode } from "react";
import { apiPost, getModeratorToken, setModeratorToken } from "../api/client";
import {
  barcodeEinscannen as barcodeEinscannenApi,
  mitgliedAbmelden as mitgliedAbmeldenApi,
  moderatorLogin,
} from "../api/auth";

const NAME_SPEICHER_KEY = "angezeigter_name";

/** Liest die "rolle"-Claim aus dem JWT, ohne die Signatur zu prüfen – das
 * Backend prüft die Berechtigung ohnehin bei jedem Request erneut, hier
 * dient es nur dazu, die Navigation im Frontend passend einzublenden. */
function rolleAusToken(token: string | null): string | null {
  if (!token) return null;
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json).rolle ?? null;
  } catch {
    return null;
  }
}

interface AuthContextValue {
  angezeigterName: string | null;
  namenEintragen: (name: string) => Promise<void>;
  barcodeEinscannen: (token: string) => Promise<string>;
  moderatorAngemeldet: boolean;
  moderatorRolle: string | null;
  moderatorAnmelden: (username: string, passwort: string) => Promise<void>;
  moderatorAbmelden: () => void;
  mitgliedAbmelden: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [angezeigterName, setAngezeigterName] = useState<string | null>(
    localStorage.getItem(NAME_SPEICHER_KEY)
  );
  const [moderatorAngemeldet, setModeratorAngemeldet] = useState<boolean>(
    getModeratorToken() !== null
  );
  const [moderatorRolle, setModeratorRolle] = useState<string | null>(
    rolleAusToken(getModeratorToken())
  );

  async function namenEintragen(name: string): Promise<void> {
    await apiPost<void>("/auth/name", { name });
    localStorage.setItem(NAME_SPEICHER_KEY, name);
    setAngezeigterName(name);
  }

  async function barcodeEinscannen(token: string): Promise<string> {
    const identitaet = await barcodeEinscannenApi(token);
    localStorage.setItem(NAME_SPEICHER_KEY, identitaet.name);
    setAngezeigterName(identitaet.name);
    return identitaet.name;
  }

  async function moderatorAnmelden(username: string, passwort: string): Promise<void> {
    const token = await moderatorLogin(username, passwort);
    setModeratorToken(token.access_token);
    setModeratorAngemeldet(true);
    setModeratorRolle(rolleAusToken(token.access_token));
  }

  function moderatorAbmelden(): void {
    setModeratorToken(null);
    setModeratorAngemeldet(false);
    setModeratorRolle(null);
  }

  /** Beendet die Mitglied-Identität (Barcode-Scan/Name-Eintrag) wieder –
   * anders als beim Moderator-Logout muss der Server aktiv werden, da das
   * Namens-Cookie httponly ist und nicht per JS gelöscht werden kann. */
  async function mitgliedAbmelden(): Promise<void> {
    await mitgliedAbmeldenApi();
    localStorage.removeItem(NAME_SPEICHER_KEY);
    setAngezeigterName(null);
  }

  return (
    <AuthContext.Provider
      value={{
        angezeigterName,
        namenEintragen,
        barcodeEinscannen,
        moderatorAngemeldet,
        moderatorRolle,
        moderatorAnmelden,
        moderatorAbmelden,
        mitgliedAbmelden,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth muss innerhalb von AuthProvider verwendet werden.");
  }
  return context;
}
