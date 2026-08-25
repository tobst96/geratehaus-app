import { useEffect, useState, type ReactNode } from "react";
import { getGruppenfuehrerToken, setGruppenfuehrerToken } from "../api/client";
import {
  barcodeEinscannen as barcodeEinscannenApi,
  mitgliedAbmelden as mitgliedAbmeldenApi,
  gruppenfuehrer2fa,
  gruppenfuehrer2faEinrichten as gruppenfuehrer2faEinrichtenApi,
  gruppenfuehrerStepUp as gruppenfuehrerStepUpApi,
  namePinLogin,
  type Gruppenfuehrer2FAEinrichtenErgebnis,
} from "../api/auth";
import { holeMeineBerechtigungen } from "../api/meta";
import { tokenGueltig } from "../utils/jwt";
import { AuthContext } from "./AuthContext";

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [angezeigterName, setAngezeigterName] = useState<string | null>(
    localStorage.getItem(NAME_SPEICHER_KEY)
  );
  // Ein abgelaufenes Token darf nicht als "angemeldet" gelten – sonst führt z. B.
  // das Logo (startseite) fälschlich in den Gruppenführer-Bereich statt zur
  // öffentlichen Startseite. Abgelaufenes Token wird gleich aufgeräumt.
  const initialToken = getGruppenfuehrerToken();
  const initialGueltig = tokenGueltig(initialToken);
  const [gruppenfuehrerAngemeldet, setGruppenfuehrerAngemeldet] = useState<boolean>(initialGueltig);
  const [gruppenfuehrerRolle, setGruppenfuehrerRolle] = useState<string | null>(
    initialGueltig ? rolleAusToken(initialToken) : null
  );

  useEffect(() => {
    if (initialToken && !initialGueltig) setGruppenfuehrerToken(null);
    // Nur einmal beim Mount – räumt ein bereits abgelaufenes Token weg.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Der API-Client meldet hierüber ein vom Server abgelehntes Token (client.ts hat
  // es bereits aus dem localStorage entfernt) – React-Status nachziehen, damit
  // GruppenfuehrerRoute sofort zu /gruppenfuehrer/login umleitet, statt die Person
  // mit wiederholten "Nicht angemeldet."-Fehlern hängen zu lassen.
  useEffect(() => {
    function sessionAbgelaufen() {
      setGruppenfuehrerAngemeldet(false);
      setGruppenfuehrerRolle(null);
    }
    window.addEventListener("gruppenfuehrer-session-abgelaufen", sessionAbgelaufen);
    return () => window.removeEventListener("gruppenfuehrer-session-abgelaufen", sessionAbgelaufen);
  }, []);
  // Eigene Modul-Rechte (Keys). null = noch nicht geladen. Admins bekommen vom
  // Backend alle Keys, sodass hatModulZugriff für sie stets true ist.
  const [modulRechte, setModulRechte] = useState<Set<string> | null>(null);

  // Rechte laden, sobald ein Gruppenführer angemeldet ist (und beim Abmelden leeren).
  useEffect(() => {
    let aktiv = true;
    if (!gruppenfuehrerAngemeldet) {
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
  }, [gruppenfuehrerAngemeldet]);

  function hatModulZugriff(modulKey: string): boolean {
    // Admin-Bypass zusätzlich zur (ohnehin alle Keys enthaltenden) Backend-Antwort,
    // damit die UI schon vor dem Laden der Rechte für Admins vollständig ist.
    if (gruppenfuehrerRolle === "admin") return true;
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
  async function barcodeEinscannenEinmalig(token: string): Promise<{ name: string; ohnePin: boolean }> {
    const identitaet = await barcodeEinscannenApi(token);
    return { name: identitaet.name, ohnePin: false };
  }

  /** Kiosk-Variante für den Namen+PIN-Login (Barcode-Modul AUS): identifiziert
   * die Person für genau EINE Eintragung (setzt den Namens-Cookie serverseitig),
   * ohne die Identität dauerhaft zu speichern. `ohnePin` meldet, ob die Person
   * keinen PIN gesetzt hatte (Eintragung bleibt möglich, wird aber vermerkt). */
  async function nameLoginEinmalig(
    personId: number,
    pin: string
  ): Promise<{ name: string; ohnePin: boolean }> {
    const identitaet = await namePinLogin(personId, pin);
    return { name: identitaet.name, ohnePin: identitaet.ohne_pin };
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
    setGruppenfuehrerToken(accessToken);
    setGruppenfuehrerAngemeldet(true);
    setGruppenfuehrerRolle(rolleAusToken(accessToken));
  }

  /** Wechsel in den Gruppenführer-/Admin-Bereich für eine bereits per
   * Namens-Cookie identifizierte Person. Liefert `{ zweiFaktorErforderlich,
   * challenge }`: ist 2FA nötig, muss der Aufrufer `gruppenfuehrer2faAbschliessen`
   * mit dem Code aufrufen. */
  async function gruppenfuehrerStepUp(): Promise<{
    zweiFaktorErforderlich: boolean;
    einrichtungErforderlich: boolean;
    emailGesetzt: boolean;
    challenge: string | null;
  }> {
    const ergebnis = await gruppenfuehrerStepUpApi();
    if (ergebnis.access_token) {
      sitzungSetzen(ergebnis.access_token);
      return { zweiFaktorErforderlich: false, einrichtungErforderlich: false, emailGesetzt: false, challenge: null };
    }
    return {
      zweiFaktorErforderlich: ergebnis.zwei_faktor_erforderlich,
      einrichtungErforderlich: ergebnis.einrichtung_erforderlich,
      emailGesetzt: ergebnis.email_gesetzt,
      challenge: ergebnis.challenge,
    };
  }

  async function gruppenfuehrer2faEinrichten(
    challenge: string,
    email?: string
  ): Promise<Gruppenfuehrer2FAEinrichtenErgebnis> {
    return gruppenfuehrer2faEinrichtenApi(challenge, email);
  }

  async function gruppenfuehrer2faAbschliessen(
    challenge: string,
    code: string,
    angemeldetBleiben: boolean
  ): Promise<void> {
    const ergebnis = await gruppenfuehrer2fa(challenge, code, angemeldetBleiben);
    if (!ergebnis.access_token) throw new Error("Kein Token erhalten.");
    sitzungSetzen(ergebnis.access_token);
  }

  function gruppenfuehrerAbmelden(): void {
    setGruppenfuehrerToken(null);
    setGruppenfuehrerAngemeldet(false);
    setGruppenfuehrerRolle(null);
  }

  /** Beendet die Mitglied-Identität (Barcode-Scan/Name-Eintrag) wieder –
   * anders als beim Gruppenführer-Logout muss der Server aktiv werden, da das
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
        gruppenfuehrerAngemeldet,
        gruppenfuehrerRolle,
        berechtigungenGeladen: modulRechte !== null || gruppenfuehrerRolle === "admin",
        hatModulZugriff,
        gruppenfuehrerStepUp,
        gruppenfuehrer2faEinrichten,
        gruppenfuehrer2faAbschliessen,
        gruppenfuehrerAbmelden,
        mitgliedAbmelden,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
