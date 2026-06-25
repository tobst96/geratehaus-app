import { useEffect, useState, type FormEvent } from "react";
import { holeEinstellungen, schreibeEinstellungen, sendeTestmail } from "../../api/moderator";
import { ApiError } from "../../api/client";

interface NotifierConfig {
  telegram_enabled: boolean;
  telegram_bot_token: string;
  telegram_chat_ids: string;
  email_enabled: boolean;
  email_smtp_host: string;
  email_smtp_port: number;
  email_smtp_user: string;
  email_smtp_password: string;
  email_smtp_use_tls: boolean;
  email_from: string;
  email_recipients: string;
  email_pdf_bei_abschluss: boolean;
  email_pdf_bei_dienstbuch_abschluss: boolean;
  webpush_enabled: boolean;
  webpush_vapid_public: string;
  webpush_vapid_private: string;
  webpush_vapid_subject: string;
}

export function NotifierEinstellungen() {
  const [config, setConfig] = useState<NotifierConfig | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [gespeichert, setGespeichert] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testmailLaeuft, setTestmailLaeuft] = useState(false);
  const [testmailErgebnis, setTestmailErgebnis] = useState<string | null>(null);

  useEffect(() => {
    async function laden() {
      try {
        const w = await holeEinstellungen();
        setConfig({
          telegram_enabled: Boolean(w.notifier_telegram_aktiv),
          telegram_bot_token: String(w.notifier_telegram_bot_token ?? ""),
          telegram_chat_ids: String(w.notifier_telegram_chat_ids ?? ""),
          email_enabled: Boolean(w.notifier_email_aktiv),
          email_smtp_host: String(w.notifier_email_smtp_host ?? ""),
          email_smtp_port: Number(w.notifier_email_smtp_port ?? 587),
          email_smtp_user: String(w.notifier_email_smtp_user ?? ""),
          email_smtp_password: String(w.notifier_email_smtp_password ?? ""),
          email_smtp_use_tls: Boolean(w.notifier_email_smtp_use_tls ?? true),
          email_from: String(w.notifier_email_from ?? ""),
          email_recipients: String(w.notifier_email_recipients ?? ""),
          email_pdf_bei_abschluss: Boolean(w.notifier_email_pdf_bei_abschluss),
          email_pdf_bei_dienstbuch_abschluss: Boolean(w.notifier_email_pdf_bei_dienstbuch_abschluss),
          webpush_enabled: Boolean(w.notifier_webpush_aktiv),
          webpush_vapid_public: String(w.notifier_webpush_vapid_public_key ?? ""),
          webpush_vapid_private: String(w.notifier_webpush_vapid_private_key ?? ""),
          webpush_vapid_subject: String(w.notifier_webpush_vapid_subject ?? ""),
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
    setFehler(null);
    try {
      await schreibeEinstellungen({
        notifier_telegram_aktiv: config.telegram_enabled,
        notifier_telegram_bot_token: config.telegram_bot_token,
        notifier_telegram_chat_ids: config.telegram_chat_ids,
        notifier_email_aktiv: config.email_enabled,
        notifier_email_smtp_host: config.email_smtp_host,
        notifier_email_smtp_port: config.email_smtp_port,
        notifier_email_smtp_user: config.email_smtp_user,
        notifier_email_smtp_password: config.email_smtp_password,
        notifier_email_smtp_use_tls: config.email_smtp_use_tls,
        notifier_email_from: config.email_from,
        notifier_email_recipients: config.email_recipients,
        notifier_email_pdf_bei_abschluss: config.email_pdf_bei_abschluss,
        notifier_email_pdf_bei_dienstbuch_abschluss: config.email_pdf_bei_dienstbuch_abschluss,
        notifier_webpush_aktiv: config.webpush_enabled,
        notifier_webpush_vapid_public_key: config.webpush_vapid_public,
        notifier_webpush_vapid_private_key: config.webpush_vapid_private,
        notifier_webpush_vapid_subject: config.webpush_vapid_subject,
      });
      setGespeichert(true);
      setTimeout(() => setGespeichert(false), 4000);
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Fehler beim Speichern");
    } finally {
      setLoading(false);
    }
  }

  async function testmailSenden() {
    if (!config) return;
    setTestmailLaeuft(true);
    setTestmailErgebnis(null);
    try {
      // Erst die aktuell im Formular stehenden SMTP-Werte sichern, damit der
      // Test nicht mit einer älteren, bereits gespeicherten Konfiguration läuft.
      await schreibeEinstellungen({
        notifier_email_aktiv: config.email_enabled,
        notifier_email_smtp_host: config.email_smtp_host,
        notifier_email_smtp_port: config.email_smtp_port,
        notifier_email_smtp_user: config.email_smtp_user,
        notifier_email_smtp_password: config.email_smtp_password,
        notifier_email_smtp_use_tls: config.email_smtp_use_tls,
        notifier_email_from: config.email_from,
        notifier_email_recipients: config.email_recipients,
        notifier_email_pdf_bei_abschluss: config.email_pdf_bei_abschluss,
      });
      await sendeTestmail();
      setTestmailErgebnis("Testmail wurde gesendet.");
    } catch (err) {
      setTestmailErgebnis(
        err instanceof ApiError ? String(err.detail) : "Testmail konnte nicht gesendet werden."
      );
    } finally {
      setTestmailLaeuft(false);
    }
  }

  if (!config) return <p>Lädt…</p>;

  return (
    <div>
      <h1>Benachrichtigungen konfigurieren</h1>
      <p>Stelle hier Telegram, Email und Web Push ein – ganz ohne .env!</p>

      {fehler && <p className="fehlertext">{fehler}</p>}
      {gespeichert && (
        <p
          style={{
            background: "#e6f7ec",
            color: "#1a7a3a",
            padding: "0.6rem 1rem",
            borderRadius: "var(--radius)",
            fontWeight: 600,
          }}
        >
          ✓ Konfiguration gespeichert
        </p>
      )}

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
            autoComplete="off"
          />
          <br />
          <br />
          <label htmlFor="tg-chat">Chat-IDs (kommagetrennt)</label>
          <input
            id="tg-chat"
            type="text"
            value={config.telegram_chat_ids}
            onChange={(e) => setConfig({ ...config, telegram_chat_ids: e.target.value })}
            placeholder="-123456789, -987654321"
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
            value={config.email_smtp_host}
            onChange={(e) => setConfig({ ...config, email_smtp_host: e.target.value })}
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
          <label>
            <input
              type="checkbox"
              checked={config.email_smtp_use_tls}
              onChange={(e) => setConfig({ ...config, email_smtp_use_tls: e.target.checked })}
              disabled={!config.email_enabled}
            />{" "}
            STARTTLS verwenden
          </label>
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
          <label htmlFor="email-recipients">Empfänger (kommagetrennt)</label>
          <input
            id="email-recipients"
            type="text"
            value={config.email_recipients}
            onChange={(e) => setConfig({ ...config, email_recipients: e.target.value })}
            placeholder="moderator@example.com"
            disabled={!config.email_enabled}
          />
          <br />
          <br />
          <label htmlFor="email-user">Benutzername</label>
          <input
            id="email-user"
            type="text"
            value={config.email_smtp_user}
            onChange={(e) => setConfig({ ...config, email_smtp_user: e.target.value })}
            placeholder="user@gmail.com"
            disabled={!config.email_enabled}
          />
          <br />
          <br />
          <label htmlFor="email-pass">Passwort</label>
          <input
            id="email-pass"
            type="password"
            value={config.email_smtp_password}
            onChange={(e) => setConfig({ ...config, email_smtp_password: e.target.value })}
            placeholder="••••••••"
            disabled={!config.email_enabled}
            autoComplete="off"
          />
          <br />
          <br />
          <label>
            <input
              type="checkbox"
              checked={config.email_pdf_bei_abschluss}
              onChange={(e) => setConfig({ ...config, email_pdf_bei_abschluss: e.target.checked })}
              disabled={!config.email_enabled}
            />{" "}
            Einsatzbericht (PDF) bei Abschluss automatisch per E-Mail versenden
          </label>
          <br />
          <label>
            <input
              type="checkbox"
              checked={config.email_pdf_bei_dienstbuch_abschluss}
              onChange={(e) =>
                setConfig({ ...config, email_pdf_bei_dienstbuch_abschluss: e.target.checked })
              }
              disabled={!config.email_enabled}
            />{" "}
            Dienstbuch (PDF) beim automatischen nächtlichen Abschluss per E-Mail versenden
          </label>
          <br />
          <br />
          <button
            type="button"
            className="sekundaer"
            onClick={testmailSenden}
            disabled={testmailLaeuft || !config.email_enabled}
          >
            {testmailLaeuft ? "Sendet …" : "Testmail senden"}
          </button>
          {testmailErgebnis && <p style={{ fontSize: "0.85rem" }}>{testmailErgebnis}</p>}
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
            autoComplete="off"
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
            autoComplete="off"
          />
          <br />
          <br />
          <label htmlFor="wp-subject">VAPID Subject (mailto:-Adresse)</label>
          <input
            id="wp-subject"
            type="text"
            value={config.webpush_vapid_subject}
            onChange={(e) => setConfig({ ...config, webpush_vapid_subject: e.target.value })}
            placeholder="mailto:admin@example.org"
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
