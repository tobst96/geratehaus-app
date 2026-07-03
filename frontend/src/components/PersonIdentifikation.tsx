import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
  type Ref,
} from "react";
import {
  barcodeVorschau,
  namePinPruefen,
  personenAuswahl,
  pinAnfordern,
  type BarcodeVorschau,
  type PersonAuswahl,
} from "../api/auth";
import { ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useConfig } from "../context/ConfigContext";
import { useBarcodeSound } from "../hooks/useBarcodeSound";
import { BarcodeEingabe } from "./BarcodeEingabe";

export interface PersonInfo {
  name: string;
  funktion_id: number | null;
  gruppe_id: number | null;
  bild_url: string | null;
}

export interface PersonIdentifikationHandle {
  /** Identifiziert die Person für genau eine Aktion (setzt den Namens-Cookie
   * serverseitig) und liefert den Namen. Wirft bei fehlender/ungültiger Eingabe. */
  identifiziere: () => Promise<string>;
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
  const { barcodeEinscannenEinmalig, nameLoginEinmalig } = useAuth();
  const { spieleErkannt, spieleFehler } = useBarcodeSound();

  // --- Barcode-Modus ---
  const [barcode, setBarcode] = useState("");
  const [vorschau, setVorschau] = useState<BarcodeVorschau | null>(null);

  // --- Namen+PIN-Modus ---
  const [suche, setSuche] = useState("");
  const [treffer, setTreffer] = useState<PersonAuswahl[]>([]);
  const [gewaehlt, setGewaehlt] = useState<PersonAuswahl | null>(null);
  const [pin, setPin] = useState("");
  const [meldung, setMeldung] = useState<string | null>(null);
  const [anfordernLaeuft, setAnfordernLaeuft] = useState(false);
  // Erst nach korrektem PIN bestätigte Person (für die Bildvorschau).
  const [pinBestaetigt, setPinBestaetigt] = useState<{ name: string; bild_url: string | null } | null>(
    null
  );

  // Barcode-Live-Vorschau
  useEffect(() => {
    if (!barcodeModus) return;
    const wert = barcode.trim();
    if (!wert) {
      setVorschau(null);
      onPersonInfo?.(null);
      onVorschau?.(null);
      return;
    }
    const timeout = setTimeout(() => {
      barcodeVorschau(wert)
        .then((v) => {
          setVorschau(v);
          onPersonInfo?.({ name: v.name, funktion_id: v.funktion_id, gruppe_id: v.gruppe_id, bild_url: v.bild_url });
          // Barcode selbst ist der Nachweis – Bildvorschau direkt melden.
          onVorschau?.({ name: v.name, bild_url: v.bild_url });
          spieleErkannt();
        })
        .catch(() => {
          setVorschau(null);
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
    if (barcodeModus || gewaehlt) return;
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
  }, [suche, gewaehlt, barcodeModus]);

  // Profilbild schon bei der Namensauswahl in den Browser-Cache vorladen, damit
  // es nach korrektem PIN sofort (ohne Ladeverzögerung) eingeblendet wird.
  useEffect(() => {
    if (barcodeModus || !gewaehlt?.bild_url) return;
    const img = new Image();
    img.src = gewaehlt.bild_url;
  }, [gewaehlt, barcodeModus]);

  // Live-PIN-Prüfung: das Profilbild erscheint erst, wenn der korrekte PIN
  // eingegeben wurde (nicht schon bei der Namensauswahl).
  useEffect(() => {
    if (barcodeModus || !gewaehlt || !gewaehlt.pin_gesetzt || !pin) {
      setPinBestaetigt(null);
      onVorschau?.(null);
      return;
    }
    const person = gewaehlt;
    const eingabe = pin;
    const timeout = setTimeout(() => {
      namePinPruefen(person.id, eingabe)
        .then((v) => {
          setPinBestaetigt(v);
          onVorschau?.(v);
        })
        .catch(() => {
          setPinBestaetigt(null);
          onVorschau?.(null);
        });
    }, 400);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin, gewaehlt, barcodeModus]);

  function zuruecksetzen() {
    setBarcode("");
    setVorschau(null);
    setSuche("");
    setTreffer([]);
    setGewaehlt(null);
    setPin("");
    setMeldung(null);
    setPinBestaetigt(null);
    onVorschau?.(null);
  }

  function personWaehlen(p: PersonAuswahl) {
    setGewaehlt(p);
    setTreffer([]);
    setSuche(p.name);
    setPin("");
    setMeldung(null);
    setPinBestaetigt(null);
    onVorschau?.(null);
    // Gruppe/Funktion sofort vorwählen (Bild kommt erst nach korrektem PIN).
    onPersonInfo?.({ name: p.name, funktion_id: p.funktion_id, gruppe_id: p.gruppe_id, bild_url: p.bild_url });
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
          : "Es wurde eine Freigabe-Anfrage an die Moderatoren geschickt (keine E-Mail hinterlegt)."
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
        const name = await barcodeEinscannenEinmalig(wert);
        return name;
      }
      if (!gewaehlt) throw new ApiError(400, "Bitte zuerst eine Person auswählen.");
      if (!gewaehlt.pin_gesetzt) {
        throw new ApiError(428, "Für diese Person ist noch kein PIN gesetzt.");
      }
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
        {vorschau && !ohneVorschau && (
          <div className="person-ident-vorschau">
            {vorschau.bild_url ? (
              <img src={vorschau.bild_url} alt={vorschau.name} className="person-ident-bild" />
            ) : (
              <div className="person-ident-initialen">{initialen(vorschau.name)}</div>
            )}
            <div className="person-ident-name">{vorschau.name}</div>
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
            setPinBestaetigt(null);
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
                {p.bild_url ? (
                  <img src={p.bild_url} alt={p.name} className="person-ident-bild-klein" />
                ) : (
                  <span className="person-ident-initialen-klein">{initialen(p.name)}</span>
                )}
                <span>{p.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {pinBestaetigt && !ohneVorschau && (
        <div className="person-ident-vorschau">
          {pinBestaetigt.bild_url ? (
            <img src={pinBestaetigt.bild_url} alt={pinBestaetigt.name} className="person-ident-bild" />
          ) : (
            <div className="person-ident-initialen">{initialen(pinBestaetigt.name)}</div>
          )}
          <div className="person-ident-name">{pinBestaetigt.name}</div>
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
          <p style={{ color: "var(--farbe-text-mute)" }}>
            Für <strong>{gewaehlt.name}</strong> ist noch kein PIN gesetzt.
          </p>
          <button type="button" className="sekundaer" onClick={pinLinkAnfordern} disabled={anfordernLaeuft}>
            {anfordernLaeuft ? "Wird angefordert…" : "PIN anfordern"}
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
