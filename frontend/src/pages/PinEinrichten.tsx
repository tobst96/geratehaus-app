import { useState, type FormEvent } from "react";
import { pinEinrichten } from "../api/auth";
import { ApiError } from "../api/client";
import { useConfig } from "../context/ConfigContext";
import { useStandort } from "../context/StandortContext";

export function PinEinrichten() {
  const { config } = useConfig();
  const { position } = useStandort();
  const pinLaenge = config?.pin_laenge ?? 4;

  const [pin, setPin] = useState("");
  const [pinWiederholung, setPinWiederholung] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);
  const [erfolg, setErfolg] = useState(false);
  const [ladevorgang, setLadevorgang] = useState(false);

  async function absenden(e: FormEvent) {
    e.preventDefault();
    if (!position) return;
    if (pin !== pinWiederholung) {
      setFehler("Die PINs stimmen nicht überein.");
      return;
    }
    setLadevorgang(true);
    setFehler(null);
    try {
      await pinEinrichten(position.lat, position.lon, pin);
      setErfolg(true);
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "PIN konnte nicht gespeichert werden.");
    } finally {
      setLadevorgang(false);
    }
  }

  if (erfolg) {
    return (
      <div className="karte">
        <h2>PIN eingerichtet</h2>
        <p>
          Du kannst dich künftig auch von außerhalb des Gerätehauses mit deinem Namen und diesem PIN
          anmelden, um den Fahrzeugkalender und deine eigenen Dienststunden einzusehen.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1>PIN einrichten</h1>
      <p>
        Mit einem {pinLaenge}-stelligen PIN kannst du später auch außerhalb des Gerätehauses auf den
        Fahrzeugkalender und deine eigenen Dienststunden zugreifen. Die Einrichtung ist nur hier vor
        Ort möglich.
      </p>
      <form onSubmit={absenden} className="karte">
        <label htmlFor="pin">PIN ({pinLaenge} Ziffern)</label>
        <input
          id="pin"
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={pinLaenge}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          required
        />
        <br />
        <br />
        <label htmlFor="pin-wiederholung">PIN wiederholen</label>
        <input
          id="pin-wiederholung"
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={pinLaenge}
          value={pinWiederholung}
          onChange={(e) => setPinWiederholung(e.target.value.replace(/\D/g, ""))}
          required
        />
        {fehler && <p className="fehlertext">{fehler}</p>}
        <br />
        <button type="submit" disabled={ladevorgang || pin.length !== pinLaenge}>
          {ladevorgang ? "Wird gespeichert …" : "PIN einrichten"}
        </button>
      </form>
    </div>
  );
}
