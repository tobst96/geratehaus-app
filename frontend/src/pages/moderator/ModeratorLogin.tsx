import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ApiError } from "../../api/client";

export function ModeratorLogin() {
  const { moderatorAnmelden } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [passwort, setPasswort] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);
  const [ladevorgang, setLadevorgang] = useState(false);

  async function absenden(e: FormEvent) {
    e.preventDefault();
    setFehler(null);
    setLadevorgang(true);
    try {
      await moderatorAnmelden(username, passwort);
      navigate("/moderator");
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Anmeldung fehlgeschlagen.");
    } finally {
      setLadevorgang(false);
    }
  }

  return (
    <div>
      <h1>Anmeldung Gruppenführer / Admin</h1>
      <form onSubmit={absenden} className="karte">
        <label htmlFor="username">Benutzername</label>
        <input
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          required
        />
        <br />
        <br />
        <label htmlFor="passwort">Passwort</label>
        <input
          id="passwort"
          type="password"
          value={passwort}
          onChange={(e) => setPasswort(e.target.value)}
          autoComplete="current-password"
          required
        />
        <br />
        <br />
        {fehler && <p className="fehlertext">{fehler}</p>}
        <button type="submit" disabled={ladevorgang}>
          {ladevorgang ? "Anmelden …" : "Anmelden"}
        </button>
      </form>
    </div>
  );
}
