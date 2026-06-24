import { createContext, useContext, useState, type ReactNode } from "react";
import { apiPost, getModeratorToken, setModeratorToken } from "../api/client";
import { barcodeEinscannen as barcodeEinscannenApi, moderatorLogin } from "../api/auth";

const NAME_SPEICHER_KEY = "angezeigter_name";

interface AuthContextValue {
  angezeigterName: string | null;
  namenEintragen: (name: string) => Promise<void>;
  barcodeEinscannen: (token: string) => Promise<string>;
  moderatorAngemeldet: boolean;
  moderatorAnmelden: (username: string, passwort: string) => Promise<void>;
  moderatorAbmelden: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [angezeigterName, setAngezeigterName] = useState<string | null>(
    localStorage.getItem(NAME_SPEICHER_KEY)
  );
  const [moderatorAngemeldet, setModeratorAngemeldet] = useState<boolean>(
    getModeratorToken() !== null
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
  }

  function moderatorAbmelden(): void {
    setModeratorToken(null);
    setModeratorAngemeldet(false);
  }

  return (
    <AuthContext.Provider
      value={{
        angezeigterName,
        namenEintragen,
        barcodeEinscannen,
        moderatorAngemeldet,
        moderatorAnmelden,
        moderatorAbmelden,
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
