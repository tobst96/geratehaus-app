import { useState, type FormEvent } from "react";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../api/client";

interface NameFormProps {
  onFertig: () => void;
}

export function NameForm({ onFertig }: NameFormProps) {
  const { angezeigterName, namenEintragen } = useAuth();
  const [name, setName] = useState(angezeigterName ?? "");
  const [fehler, setFehler] = useState<string | null>(null);
  const [ladevorgang, setLadevorgang] = useState(false);

  async function absenden(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLadevorgang(true);
    setFehler(null);
    try {
      await namenEintragen(name.trim());
      onFertig();
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Name konnte nicht gespeichert werden.");
    } finally {
      setLadevorgang(false);
    }
  }

  return (
    <div className="karte">
      <h2>Wie heißt du?</h2>
      <p style={{ fontSize: "0.9rem", color: "#666" }}>
        Dein Name wird in einem Cookie auf diesem Gerät gespeichert, damit er beim nächsten Besuch
        vorausgefüllt ist. Mehr dazu in den{" "}
        <a href="/datenschutz" target="_blank" rel="noreferrer">
          Datenschutzhinweisen
        </a>
        .
      </p>
      <form onSubmit={absenden}>
        <label htmlFor="anzeigename">Vor- und Nachname</label>
        <input
          id="anzeigename"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          required
        />
        {fehler && <p className="fehlertext">{fehler}</p>}
        <br />
        <button type="submit" disabled={ladevorgang || !name.trim()}>
          {ladevorgang ? "Wird gespeichert …" : "Weiter"}
        </button>
      </form>
    </div>
  );
}
