import { useEffect, useState, type FormEvent } from "react";
import { ApiError } from "../../api/client";

interface NotifierConfig {
  telegram_enabled: boolean;
  telegram_bot_token: string;
  telegram_chat_id: string;
  email_enabled: boolean;
  email_smtp_server: string;
  email_smtp_port: number;
  email_from: string;
  email_username: string;
  email_password: string;
  webpush_enabled: boolean;
  webpush_vapid_public: string;
  webpush_vapid_private: string;
}

export function NotifierEinstellungen() {
  const [config, setConfig] = useState<NotifierConfig | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [gespeichert, setGespeichert] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function laden() {
      try {
        // In real scenario: await apiGet("/moderator/notifier-config")
        setConfig({
          telegram_enabled: false,
          telegram_bot_token: "",
          telegram_chat_id: "",
          email_enabled: false,
          email_smtp_server: "",
          email_smtp_port: 587,
          email_from: "",
          email_username: "",
          email_password: "",
          webpush_enabled: false,
          webpush_vapid_public: "",
          webpush_vapid_private: "",
        });
      } catch (err) {
        setFehler(err instanceof ApiError ? String(err.detail) : "Fehler beim Laden");
      }
    }
    laden();
  }, []);

  async function speichern(e: FormEvent) {
    e.preventDefault();
    if (!config) return;
    setLoading(true);
    setGespeichert(false);
    try {
      // In real scenario: await apiPost("/moderator/notifier-config", config)
      console.log("Saving config:", config);
      setGespeichert(true);
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Fehler beim Speichern");
    } finally {
      setLoading(false);
    }
  }

  if (!config) return <p>Lädt…</p>;

  return (
    <div>
      <h1>Benachrichtigungen konfigurieren</h1>
      <p>Stelle hier Telegram, Email und Web Push ein – ganz ohne .env!</p>

      {fehler && <p style={{ color: "red" }}>{fehler}</p>}
      {gespeichert && <p style={{ color: "green" }}>✓ Konfiguration gespeichert</p>}

      <form onSubmit={speichern}>
        {/* Telegram */}
        <div className="karte">
          <h2>🤖 Telegram</h2>
          <label>
            <input
              type="checkbox"
              checked={config.telegram_enabled}
              onChange={(e) => setConfig({ ...config, telegram_enabled: e.target.checked })}
            />{" "}
            Telegram aktivieren
          </label>
          <br />
          <br />
          <label htmlFor="tg-token">Bot Token</label>
          <input
            id="tg-token"
            type="password"
            value={config.telegram_bot_token}
            onChange={(e) => setConfig({ ...config, telegram_bot_token: e.target.value })}
            placeholder="123456:ABC-DEF..."
            disabled={!config.telegram_enabled}
          />
          <br />
          <br />
          <label htmlFor="tg-chat">Chat ID</label>
          <input
            id="tg-chat"
            type="text"
            value={config.telegram_chat_id}
            onChange={(e) => setConfig({ ...config, telegram_chat_id: e.target.value })}
            placeholder="-123456789"
            disabled={!config.telegram_enabled}
          />
        </div>

        {/* Email */}
        <div className="karte">
          <h2>📧 Email (SMTP)</h2>
          <label>
            <input
              type="checkbox"
              checked={config.email_enabled}
              onChange={(e) => setConfig({ ...config, email_enabled: e.target.checked })}
            />{" "}
            Email aktivieren
          </label>
          <br />
          <br />
          <label htmlFor="email-server">SMTP Server</label>
          <input
            id="email-server"
            type="text"
            value={config.email_smtp_server}
            onChange={(e) => setConfig({ ...config, email_smtp_server: e.target.value })}
            placeholder="smtp.gmail.com"
            disabled={!config.email_enabled}
          />
          <br />
          <br />
          <label htmlFor="email-port">SMTP Port</label>
          <input
            id="email-port"
            type="number"
            value={config.email_smtp_port}
            onChange={(e) => setConfig({ ...config, email_smtp_port: Number(e.target.value) })}
            disabled={!config.email_enabled}
          />
          <br />
          <br />
          <label htmlFor="email-from">Von Email-Adresse</label>
          <input
            id="email-from"
            type="email"
            value={config.email_from}
            onChange={(e) => setConfig({ ...config, email_from: e.target.value })}
            placeholder="notifications@example.com"
            disabled={!config.email_enabled}
          />
          <br />
          <br />
          <label htmlFor="email-user">Benutzername</label>
          <input
            id="email-user"
            type="text"
            value={config.email_username}
            onChange={(e) => setConfig({ ...config, email_username: e.target.value })}
            placeholder="user@gmail.com"
            disabled={!config.email_enabled}
          />
          <br />
          <br />
          <label htmlFor="email-pass">Passwort</label>
          <input
            id="email-pass"
            type="password"
            value={config.email_password}
            onChange={(e) => setConfig({ ...config, email_password: e.target.value })}
            placeholder="••••••••"
            disabled={!config.email_enabled}
          />
        </div>

        {/* Web Push */}
        <div className="karte">
          <h2>🔔 Web Push (VAPID)</h2>
          <label>
            <input
              type="checkbox"
              checked={config.webpush_enabled}
              onChange={(e) => setConfig({ ...config, webpush_enabled: e.target.checked })}
            />{" "}
            Web Push aktivieren
          </label>
          <br />
          <br />
          <label htmlFor="wp-public">VAPID Public Key</label>
          <input
            id="wp-public"
            type="password"
            value={config.webpush_vapid_public}
            onChange={(e) => setConfig({ ...config, webpush_vapid_public: e.target.value })}
            placeholder="BFx..."
            disabled={!config.webpush_enabled}
          />
          <br />
          <br />
          <label htmlFor="wp-private">VAPID Private Key</label>
          <input
            id="wp-private"
            type="password"
            value={config.webpush_vapid_private}
            onChange={(e) => setConfig({ ...config, webpush_vapid_private: e.target.value })}
            placeholder="abc..."
            disabled={!config.webpush_enabled}
          />
          <p style={{ fontSize: "0.85rem", color: "#666" }}>
            Generiere Keys mit: <code>webpush generate-vapid-keys</code>
          </p>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Wird gespeichert…" : "Konfiguration speichern"}
        </button>
      </form>
    </div>
  );
}
