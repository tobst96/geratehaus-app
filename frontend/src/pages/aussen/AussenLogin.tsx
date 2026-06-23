import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useConfig } from "../../context/ConfigContext";
import { pinVerifizieren } from "../../api/auth";
import { ApiError } from "../../api/client";
import { setzePinVerifiziert } from "../../api/pinSession";
import { NameForm } from "../../components/NameForm";

export function AussenLogin() {
  const { angezeigterName } = useAuth();
  const { config } = useConfig();
  const navigate = useNavigate();
  const pinLaenge = config?.pin_laenge ?? 4;

  const [pin, setPin] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);
  const [ladevorgang, setLadevorgang] = useState(false);

  async function absenden(e: FormEvent) {
    e.preventDefault();
    setLadevorgang(true);
    setFehler(null);
    try {
      await pinVerifizieren(pin);
      setzePinVerifiziert();
      navigate("/aussen");
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "PIN-Prüfung fehlgeschlagen.");
    } finally {
      setLadevorgang(false);
    }
  }

  if (!angezeigterName) {
    return <NameForm onFertig={() => {}} />;
  }

  return (
    <div>
      <h1>Anmeldung außerhalb des Gerätehauses</h1>
      <p>Hallo {angezeigterName}, bitte gib deinen PIN ein.</p>
      <form onSubmit={absenden} className="karte">
        <label htmlFor="aussen-pin">PIN ({pinLaenge} Ziffern)</label>
        <input
          id="aussen-pin"
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={pinLaenge}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          autoFocus
          required
        />
        {fehler && <p className="fehlertext">{fehler}</p>}
        <br />
        <button type="submit" disabled={ladevorgang || pin.length !== pinLaenge}>
          {ladevorgang ? "Wird geprüft …" : "Anmelden"}
        </button>
      </form>
      <p style={{ fontSize: "0.85rem", color: "#666" }}>
        Noch keinen PIN eingerichtet? Das ist nur direkt im Gerätehaus möglich.
      </p>
    </div>
  );
}
