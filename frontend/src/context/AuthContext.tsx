import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getModeratorToken, setModeratorToken } from "../api/client";
import {
  barcodeEinscannen as barcodeEinscannenApi,
  mitgliedAbmelden as mitgliedAbmeldenApi,
  moderator2fa,
  moderatorLogin,
  namePinLogin,
} from "../api/auth";
import { holeMeineBerechtigungen } from "../api/meta";

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
  barcodeEinscannen: (token: string) => Promise<string>;
  barcodeEinscannenEinmalig: (token: string) => Promise<string>;
  nameLoginEinmalig: (personId: number, pin: string) => Promise<string>;
  /** Merkt eine bereits serverseitig gesetzte Identität lokal (Anzeige/Persistenz),
   * z. B. nach einem Namen+PIN-Login im Mitgliederbereich. */
  identitaetSpeichern: (name: string) => void;
  kioskScanBeenden: () => Promise<void>;
  moderatorAngemeldet: boolean;
  moderatorRolle: string | null;
  /** True, sobald die eigenen Modul-Rechte geladen wurden (Guards warten darauf). */
  berechtigungenGeladen: boolean;
  /** Ob der angemeldete Moderator auf ein Modul zugreifen darf (Admin: immer true). */
  hatModulZugriff: (modulKey: string) => boolean;
  moderatorAnmelden: (
    username: string,
    passwort: string
  ) => Promise<{ zweiFaktorErforderlich: boolean; challenge: string | null }>;
  moderator2faAbschliessen: (
    challenge: string,
    code: string,
    angemeldetBleiben: boolean
  ) => Promise<void>;
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
  // Eigene Modul-Rechte (Keys). null = noch nicht geladen. Admins bekommen vom
  // Backend alle Keys, sodass hatModulZugriff für sie stets true ist.
  const [modulRechte, setModulRechte] = useState<Set<string> | null>(null);

  // Rechte laden, sobald ein Moderator angemeldet ist (und beim Abmelden leeren).
  useEffect(() => {
    let aktiv = true;
    if (!moderatorAngemeldet) {
      setModulRechte(null);
      return;
    }
    holeMeineBerechtigungen()
      .then((r) => {
        if (aktiv) setModulRechte(new Set(r.keys));
      })
      .catch(() => {
        if (aktiv) setModulRechte(new Set());
      });
    return () => {
      aktiv = false;
    };
  }, [moderatorAngemeldet]);

  function hatModulZugriff(modulKey: string): boolean {
    // Admin-Bypass zusätzlich zur (ohnehin alle Keys enthaltenden) Backend-Antwort,
    // damit die UI schon vor dem Laden der Rechte für Admins vollständig ist.
    if (moderatorRolle === "admin") return true;
    return modulRechte?.has(modulKey) ?? false;
  }

  async function barcodeEinscannen(token: string): Promise<string> {
    const identitaet = await barcodeEinscannenApi(token);
    localStorage.setItem(NAME_SPEICHER_KEY, identitaet.name);
    setAngezeigterName(identitaet.name);
    return identitaet.name;
  }

  /** Kiosk-Variante: löst den Barcode nur zur Bestätigung für genau EINE
   * Eintragung auf und setzt den Namens-Cookie (den die Buchung serverseitig
   * über CurrentPerson liest), OHNE die Identität dauerhaft zu speichern
   * (kein localStorage/angezeigterName). So bleibt auf dem öffentlich
   * stehenden Kiosk niemand eingeloggt – es ist reine Bestätigung. */
  async function barcodeEinscannenEinmalig(token: string): Promise<string> {
    const identitaet = await barcodeEinscannenApi(token);
    return identitaet.name;
  }

  /** Kiosk-Variante für den Namen+PIN-Login (Barcode-Modul AUS): identifiziert
   * die Person für genau EINE Eintragung (setzt den Namens-Cookie serverseitig),
   * ohne die Identität dauerhaft zu speichern. */
  async function nameLoginEinmalig(personId: number, pin: string): Promise<string> {
    const identitaet = await namePinLogin(personId, pin);
    return identitaet.name;
  }

  function identitaetSpeichern(name: string): void {
    localStorage.setItem(NAME_SPEICHER_KEY, name);
    setAngezeigterName(name);
  }

  /** Löscht den Namens-Cookie serverseitig wieder – nach einer Kiosk-Eintragung,
   * damit der nächste sich frisch einscannen kann und niemand eingeloggt bleibt. */
  async function kioskScanBeenden(): Promise<void> {
    await mitgliedAbmeldenApi();
  }

  function sitzungSetzen(accessToken: string): void {
    setModeratorToken(accessToken);
    setModeratorAngemeldet(true);
    setModeratorRolle(rolleAusToken(accessToken));
  }

  /** Login Schritt 1. Liefert `{ zweiFaktorErforderlich, challenge }`: ist 2FA
   * nötig, muss der Aufrufer `moderator2faAbschliessen` mit dem Code aufrufen. */
  async function moderatorAnmelden(
    username: string,
    passwort: string
  ): Promise<{ zweiFaktorErforderlich: boolean; challenge: string | null }> {
    const ergebnis = await moderatorLogin(username, passwort);
    if (ergebnis.access_token) {
      sitzungSetzen(ergebnis.access_token);
      return { zweiFaktorErforderlich: false, challenge: null };
    }
    return { zweiFaktorErforderlich: ergebnis.zwei_faktor_erforderlich, challenge: ergebnis.challenge };
  }

  async function moderator2faAbschliessen(
    challenge: string,
    code: string,
    angemeldetBleiben: boolean
  ): Promise<void> {
    const ergebnis = await moderator2fa(challenge, code, angemeldetBleiben);
    if (!ergebnis.access_token) throw new Error("Kein Token erhalten.");
    sitzungSetzen(ergebnis.access_token);
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
        barcodeEinscannen,
        barcodeEinscannenEinmalig,
        nameLoginEinmalig,
        identitaetSpeichern,
        kioskScanBeenden,
        moderatorAngemeldet,
        moderatorRolle,
        berechtigungenGeladen: modulRechte !== null || moderatorRolle === "admin",
        hatModulZugriff,
        moderatorAnmelden,
        moderator2faAbschliessen,
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
