import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
  type Ref,
} from "react";
import { Link } from "react-router-dom";
import {
  barcodeVorschau,
  namePinPruefen,
  personenAuswahl,
  pinAnfordern,
  type PersonAuswahl,
} from "../api/auth";
import { ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useConfig } from "../context/ConfigContext";
import { useBarcodeSound } from "../hooks/useBarcodeSound";
import { useGehaltenePerson } from "../hooks/useGehaltenePerson";
import { istKioskModus } from "../utils/kiosk";
import { BarcodeEingabe } from "./BarcodeEingabe";

export interface PersonInfo {
  name: string;
  funktion_id: number | null;
  gruppe_id: number | null;
  bild_url: string | null;
}

export interface IdentifiziertePerson {
  name: string;
  /** True, wenn die Person keinen PIN gesetzt hatte und die Identifikation
   * deshalb ohne PIN-Prüfung erfolgte (Eintragung bleibt möglich, wird aber
   * in Listen/PDF gekennzeichnet). Bei Barcode-Login immer false. */
  ohnePin: boolean;
}

export interface PersonIdentifikationHandle {
  /** Identifiziert die Person für genau eine Aktion (setzt den Namens-Cookie
   * serverseitig) und liefert Name + ob es ohne PIN geschah. Wirft bei
   * fehlender Eingabe oder falschem PIN. */
  identifiziere: () => Promise<IdentifiziertePerson>;
  zuruecksetzen: () => void;
}

interface Props {
  autoFocus?: boolean;
  /** Meldet die erkannte Person (für Vorauswahl von Funktion/Gruppe). Feuert im
   * Namen-Modus bereits bei der Auswahl (für die Gruppen-/Funktionsvorwahl). */
  onPersonInfo?: (info: PersonInfo | null) => void;
  /** Meldet die *bestätigte* Person für eine große Bildvorschau – im Barcode-Modus
   * beim Scan, im Namen-Modus erst nach korrektem PIN. */
  onVorschau?: (person: { name: string; bild_url: string | null } | null) => void;
  /** Unterdrückt die eingebaute Bildvorschau – der Aufrufer zeigt sie selbst
   * (z. B. groß links im Sitzplatz-Popup). */
  ohneVorschau?: boolean;
}

function initialen(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((t) => t.charAt(0))
    .join("")
    .toUpperCase();
}

function PersonIdentifikationImpl(
  { autoFocus, onPersonInfo, onVorschau, ohneVorschau }: Props,
  ref: Ref<PersonIdentifikationHandle>
) {
  const { config } = useConfig();
  const barcodeModus = config?.modul_barcode_aktiv !== false;
  // Name+PIN ist nur am Kiosk-Tablet erlaubt – außerhalb (öffentlicher
  // Mitglieder-Login, direkt aufgerufene Modul-Seiten) gilt ausschließlich der
  // Name+Passwort-Login unter /mitglied/login.
  const kioskModus = istKioskModus();
  const { barcodeEinscannenEinmalig, nameLoginEinmalig } = useAuth();
  const { spieleErkannt, spieleFehler } = useBarcodeSound();

  // --- Barcode-Modus ---
  const [barcode, setBarcode] = useState("");

  // --- Namen+PIN-Modus ---
  const [suche, setSuche] = useState("");
  const [treffer, setTreffer] = useState<PersonAuswahl[]>([]);
  const [gewaehlt, setGewaehlt] = useState<PersonAuswahl | null>(null);
  const [pin, setPin] = useState("");
  const [meldung, setMeldung] = useState<string | null>(null);
  const [anfordernLaeuft, setAnfordernLaeuft] = useState(false);
  // Angezeigte (gehaltene) Bestätigungsperson – bleibt mind. 5s sichtbar,
  // auch wenn ein Formular-Reset (zuruecksetzen) schneller kommt.
  const { gehalten, zeigen: gehalteneZeigen, graceClear: gehalteneGraceClear, forceClear: gehalteneForceClear } =
    useGehaltenePerson();

  // Barcode-Live-Vorschau
  useEffect(() => {
    if (!barcodeModus) return;
    const wert = barcode.trim();
    if (!wert) {
      gehalteneGraceClear();
      onPersonInfo?.(null);
      onVorschau?.(null);
      return;
    }
    const timeout = setTimeout(() => {
      barcodeVorschau(wert)
        .then((v) => {
          gehalteneZeigen({ name: v.name, bild_url: v.bild_url });
          onPersonInfo?.({ name: v.name, funktion_id: v.funktion_id, gruppe_id: v.gruppe_id, bild_url: v.bild_url });
          // Barcode selbst ist der Nachweis – Bildvorschau direkt melden.
          onVorschau?.({ name: v.name, bild_url: v.bild_url });
          spieleErkannt();
        })
        .catch(() => {
          gehalteneGraceClear();
          onPersonInfo?.(null);
          onVorschau?.(null);
          spieleFehler();
        });
    }, 250);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barcode, barcodeModus]);

  // Namenssuche (debounced), nur solange keine Person gewählt ist
  useEffect(() => {
    if (barcodeModus || !kioskModus || gewaehlt) return;
    const wert = suche.trim();
    if (!wert) {
      setTreffer([]);
      return;
    }
    const timeout = setTimeout(() => {
      personenAuswahl(wert)
        .then(setTreffer)
        .catch(() => setTreffer([]));
    }, 250);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suche, gewaehlt, barcodeModus, kioskModus]);

  // Profilbild schon bei der Namensauswahl in den Browser-Cache vorladen, damit
  // es nach korrektem PIN sofort (ohne Ladeverzögerung) eingeblendet wird.
  useEffect(() => {
    if (barcodeModus || !kioskModus || !gewaehlt?.bild_url) return;
    const img = new Image();
    img.src = gewaehlt.bild_url;
  }, [gewaehlt, barcodeModus, kioskModus]);

  // Live-PIN-Prüfung: das Profilbild erscheint erst, wenn der korrekte PIN
  // eingegeben wurde (nicht schon bei der Namensauswahl). Ohne gesetzten PIN
  // gibt es nichts zu prüfen – die Vorschau wurde bereits bei der Auswahl
  // gesetzt (siehe personWaehlen) und darf hier nicht wieder gelöscht werden.
  useEffect(() => {
    if (barcodeModus || !kioskModus || !gewaehlt || !gewaehlt.pin_gesetzt) {
      return;
    }
    if (!pin) {
      gehalteneGraceClear();
      onVorschau?.(null);
      return;
    }
    const person = gewaehlt;
    const eingabe = pin;
    const timeout = setTimeout(() => {
      namePinPruefen(person.id, eingabe)
        .then((v) => {
          gehalteneZeigen(v);
          onVorschau?.(v);
        })
        .catch(() => {
          gehalteneGraceClear();
          onVorschau?.(null);
        });
    }, 400);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin, gewaehlt, barcodeModus, kioskModus]);

  function zuruecksetzen() {
    setBarcode("");
    setSuche("");
    setTreffer([]);
    setGewaehlt(null);
    setPin("");
    setMeldung(null);
    // Ein Reset nach erfolgreicher Eintragung kommt oft schneller als ein
    // Mensch das Bestätigungsfoto lesen kann – daher gehalten statt sofort
    // gelöscht (siehe useGehaltenePerson).
    gehalteneGraceClear();
    onVorschau?.(null);
  }

  function personWaehlen(p: PersonAuswahl) {
    setGewaehlt(p);
    setTreffer([]);
    setSuche(p.name);
    setPin("");
    setMeldung(null);
    // Aktive neue Auswahl durch den Bediener – kein Warten nötig.
    gehalteneForceClear();
    // Gruppe/Funktion sofort vorwählen (Bild bei gesetztem PIN erst nach dessen
    // korrekter Eingabe – ohne PIN gibt es nichts zu prüfen, daher sofort).
    onPersonInfo?.({ name: p.name, funktion_id: p.funktion_id, gruppe_id: p.gruppe_id, bild_url: p.bild_url });
    if (p.pin_gesetzt) {
      onVorschau?.(null);
    } else {
      gehalteneZeigen({ name: p.name, bild_url: p.bild_url });
      onVorschau?.({ name: p.name, bild_url: p.bild_url });
    }
  }

  async function pinLinkAnfordern() {
    if (!gewaehlt) return;
    setAnfordernLaeuft(true);
    setMeldung(null);
    try {
      const { weg } = await pinAnfordern(gewaehlt.id);
      setMeldung(
        weg === "mail"
          ? "Ein Link zum Setzen des PINs wurde an die hinterlegte E-Mail geschickt."
          : "Es wurde eine Freigabe-Anfrage an die Gruppenführer geschickt (keine E-Mail hinterlegt)."
      );
    } catch (err) {
      setMeldung(err instanceof ApiError ? String(err.detail) : "Anfrage fehlgeschlagen.");
    } finally {
      setAnfordernLaeuft(false);
    }
  }

  useImperativeHandle(ref, () => ({
    async identifiziere() {
      if (barcodeModus) {
        const wert = barcode.trim();
        if (!wert) throw new ApiError(400, "Barcode erforderlich.");
        return await barcodeEinscannenEinmalig(wert);
      }
      if (!kioskModus) {
        throw new ApiError(
          400,
          "Diese Anmeldung ist nur am Kiosk-Tablet verfügbar. Bitte über den persönlichen Login anmelden."
        );
      }
      if (!gewaehlt) throw new ApiError(400, "Bitte zuerst eine Person auswählen.");
      try {
        return await nameLoginEinmalig(gewaehlt.id, pin);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          throw new ApiError(401, "PIN falsch.");
        }
        throw err;
      }
    },
    zuruecksetzen,
  }));

  if (barcodeModus) {
    return (
      <div className="person-ident">
        {gehalten && !ohneVorschau && (
          <div className="person-ident-vorschau">
            {gehalten.bild_url ? (
              <img src={gehalten.bild_url} alt={gehalten.name} className="person-ident-bild" />
            ) : (
              <div className="person-ident-initialen">{initialen(gehalten.name)}</div>
            )}
            <div className="person-ident-name">{gehalten.name}</div>
          </div>
        )}
        <label htmlFor="ident-barcode">Barcode einscannen</label>
        <BarcodeEingabe
          id="ident-barcode"
          type="text"
          value={barcode}
          onChange={setBarcode}
          placeholder="Barcode scannen oder eingeben"
          autoFocus={autoFocus}
        />
      </div>
    );
  }

  if (!kioskModus) {
    return (
      <div className="person-ident">
        <p className="text-mute">
          🔒 Diese Anmeldung ist nur am Kiosk-Tablet verfügbar. Bitte über den{" "}
          <Link to="/mitglied/login">persönlichen Login</Link> anmelden.
        </p>
      </div>
    );
  }

  return (
    <div className="person-ident">
      <label htmlFor="ident-suche">Name</label>
      <input
        id="ident-suche"
        type="text"
        value={suche}
        autoFocus={autoFocus}
        placeholder="Namen eingeben und auswählen"
        onChange={(e) => {
          setSuche(e.target.value);
          if (gewaehlt) {
            setGewaehlt(null);
            setPin("");
            setMeldung(null);
            gehalteneForceClear();
            onPersonInfo?.(null);
            onVorschau?.(null);
          }
        }}
      />
      {!gewaehlt && treffer.length > 0 && (
        <ul className="person-ident-treffer">
          {treffer.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => personWaehlen(p)}>
                {/* Kein Foto in der Trefferliste – das Profilbild erscheint erst
                    nach korrektem PIN. Nur Initialen zur groben Orientierung. */}
                <span className="person-ident-initialen-klein">{initialen(p.name)}</span>
                <span>{p.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {gehalten && !ohneVorschau && (
        <div className="person-ident-vorschau">
          {gehalten.bild_url ? (
            <img src={gehalten.bild_url} alt={gehalten.name} className="person-ident-bild" />
          ) : (
            <div className="person-ident-initialen">{initialen(gehalten.name)}</div>
          )}
          <div className="person-ident-name">{gehalten.name}</div>
        </div>
      )}

      {gewaehlt && gewaehlt.pin_gesetzt && (
        <div className="formular-feld" style={{ marginTop: 8 }}>
          <label htmlFor="ident-pin">PIN</label>
          <input
            id="ident-pin"
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="Persönlicher PIN"
            autoFocus
          />
        </div>
      )}

      {gewaehlt && !gewaehlt.pin_gesetzt && (
        <div style={{ marginTop: 8 }}>
          <p className="text-mute">
            Für <strong>{gewaehlt.name}</strong> ist noch kein PIN gesetzt. Die Eintragung ist trotzdem
            möglich, wird aber als „ohne PIN" vermerkt.
          </p>
          <button type="button" className="sekundaer" onClick={pinLinkAnfordern} disabled={anfordernLaeuft}>
            {anfordernLaeuft ? "Wird angefordert…" : "PIN für später anfordern"}
          </button>
        </div>
      )}

      {meldung && <p style={{ marginTop: 8 }}>{meldung}</p>}
    </div>
  );
}

export const PersonIdentifikation = forwardRef<PersonIdentifikationHandle, Props>(
  PersonIdentifikationImpl
);
