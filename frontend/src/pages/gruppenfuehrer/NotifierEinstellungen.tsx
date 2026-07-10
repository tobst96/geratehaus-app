import { Fehlertext } from "../../components/Fehlertext";
import { useEffect, useState, type FormEvent } from "react";
import {
  holeEinstellungen,
  schreibeEinstellungen,
  sendeTestmail,
  sendeTestdruck,
} from "../../api/gruppenfuehrer";
import { ApiError } from "../../api/client";
import { Banner } from "../../components/Banner";
import { Ladeanzeige } from "../../components/Ladeanzeige";
import { texte } from "../../i18n/texte";

const t = texte.notifier_einstellungen;

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
  drucker_aktiv: boolean;
  drucker_ipp_url: string;
  drucker_immer_einsatz: boolean;
  drucker_immer_dienstbuch: boolean;
  webpush_enabled: boolean;
  webpush_vapid_public: string;
  webpush_vapid_private: string;
  webpush_vapid_subject: string;
  ereignis_neuer_einsatz: boolean;
  ereignis_divera_alarm: boolean;
  ereignis_neues_dienstbuch: boolean;
  ereignis_buchungsanfrage: boolean;
  ereignis_schwellenwert: boolean;
  ereignis_person_inaktiv: boolean;
}

const EREIGNISSE: { feld: keyof NotifierConfig; label: string }[] = [
  { feld: "ereignis_neuer_einsatz", label: t.ereignis_neuer_einsatz },
  { feld: "ereignis_divera_alarm", label: t.ereignis_divera_alarm },
  { feld: "ereignis_neues_dienstbuch", label: t.ereignis_neues_dienstbuch },
  { feld: "ereignis_buchungsanfrage", label: t.ereignis_buchungsanfrage },
  { feld: "ereignis_schwellenwert", label: t.ereignis_schwellenwert },
  { feld: "ereignis_person_inaktiv", label: t.ereignis_person_inaktiv },
];

export function NotifierEinstellungen() {
  const [config, setConfig] = useState<NotifierConfig | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [gespeichert, setGespeichert] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testmailLaeuft, setTestmailLaeuft] = useState(false);
  const [testmailErgebnis, setTestmailErgebnis] = useState<string | null>(null);
  const [testdruckLaeuft, setTestdruckLaeuft] = useState(false);
  const [testdruckErgebnis, setTestdruckErgebnis] = useState<string | null>(null);

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
          drucker_aktiv: Boolean(w.drucker_aktiv),
          drucker_ipp_url: String(w.drucker_ipp_url ?? ""),
          drucker_immer_einsatz: Boolean(w.drucker_immer_einsatz),
          drucker_immer_dienstbuch: Boolean(w.drucker_immer_dienstbuch),
          webpush_enabled: Boolean(w.notifier_webpush_aktiv),
          webpush_vapid_public: String(w.notifier_webpush_vapid_public_key ?? ""),
          webpush_vapid_private: String(w.notifier_webpush_vapid_private_key ?? ""),
          webpush_vapid_subject: String(w.notifier_webpush_vapid_subject ?? ""),
          ereignis_neuer_einsatz: Boolean(w.benachrichtigung_neuer_einsatz),
          ereignis_divera_alarm: Boolean(w.benachrichtigung_divera_alarm ?? true),
          ereignis_neues_dienstbuch: Boolean(w.benachrichtigung_neues_dienstbuch),
          ereignis_buchungsanfrage: Boolean(w.benachrichtigung_buchungsanfrage),
          ereignis_schwellenwert: Boolean(w.benachrichtigung_schwellenwert_ueberschreitung),
          ereignis_person_inaktiv: Boolean(w.benachrichtigung_person_inaktiv),
        });
      } catch (err) {
        setFehler(err instanceof ApiError ? String(err.detail) : t.fehler_laden);
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
        drucker_aktiv: config.drucker_aktiv,
        drucker_ipp_url: config.drucker_ipp_url,
        drucker_immer_einsatz: config.drucker_immer_einsatz,
        drucker_immer_dienstbuch: config.drucker_immer_dienstbuch,
        notifier_webpush_aktiv: config.webpush_enabled,
        notifier_webpush_vapid_public_key: config.webpush_vapid_public,
        notifier_webpush_vapid_private_key: config.webpush_vapid_private,
        notifier_webpush_vapid_subject: config.webpush_vapid_subject,
        benachrichtigung_neuer_einsatz: config.ereignis_neuer_einsatz,
        benachrichtigung_divera_alarm: config.ereignis_divera_alarm,
        benachrichtigung_neues_dienstbuch: config.ereignis_neues_dienstbuch,
        benachrichtigung_buchungsanfrage: config.ereignis_buchungsanfrage,
        benachrichtigung_schwellenwert_ueberschreitung: config.ereignis_schwellenwert,
        benachrichtigung_person_inaktiv: config.ereignis_person_inaktiv,
      });
      setGespeichert(true);
      setTimeout(() => setGespeichert(false), 4000);
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : t.fehler_speichern);
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
      setTestmailErgebnis(t.testmail_erfolg);
    } catch (err) {
      setTestmailErgebnis(
        err instanceof ApiError ? String(err.detail) : t.testmail_fehler
      );
    } finally {
      setTestmailLaeuft(false);
    }
  }

  async function testdruckSenden() {
    if (!config) return;
    setTestdruckLaeuft(true);
    setTestdruckErgebnis(null);
    try {
      // Erst die aktuell im Formular stehende Drucker-Konfiguration sichern,
      // damit der Testdruck nicht mit einer älteren Adresse läuft.
      await schreibeEinstellungen({
        drucker_aktiv: config.drucker_aktiv,
        drucker_ipp_url: config.drucker_ipp_url,
      });
      await sendeTestdruck();
      setTestdruckErgebnis(t.testdruck_erfolg);
    } catch (err) {
      setTestdruckErgebnis(
        err instanceof ApiError ? String(err.detail) : t.testdruck_fehler
      );
    } finally {
      setTestdruckLaeuft(false);
    }
  }

  if (!config) return <Ladeanzeige />;

  return (
    <div>
      <h1>{t.titel}</h1>
      <p>{t.intro}</p>

      {fehler && <Fehlertext>{fehler}</Fehlertext>}
      {gespeichert && <Banner art="erfolg">{t.gespeichert_banner}</Banner>}

      <form onSubmit={speichern}>
        {/* Telegram */}
        <div className="karte">
          <h2>{t.telegram_titel}</h2>
          <div className="formular-feld">
            <label>
              <input
                type="checkbox"
                checked={config.telegram_enabled}
                onChange={(e) => setConfig({ ...config, telegram_enabled: e.target.checked })}
              />{" "}
              {t.telegram_aktivieren}
            </label>
          </div>
          <div className="formular-feld">
            <label htmlFor="tg-token">{t.bot_token}</label>
            <input
              id="tg-token"
              type="password"
              value={config.telegram_bot_token}
              onChange={(e) => setConfig({ ...config, telegram_bot_token: e.target.value })}
              placeholder="123456:ABC-DEF..."
              disabled={!config.telegram_enabled}
              autoComplete="off"
            />
          </div>
          <div className="formular-feld">
            <label htmlFor="tg-chat">{t.chat_ids}</label>
            <input
              id="tg-chat"
              type="text"
              value={config.telegram_chat_ids}
              onChange={(e) => setConfig({ ...config, telegram_chat_ids: e.target.value })}
              placeholder="-123456789, -987654321"
              disabled={!config.telegram_enabled}
            />
          </div>
        </div>

        {/* Email */}
        <div className="karte">
          <h2>{t.email_titel}</h2>
          <div className="formular-feld">
            <label>
              <input
                type="checkbox"
                checked={config.email_enabled}
                onChange={(e) => setConfig({ ...config, email_enabled: e.target.checked })}
              />{" "}
              {t.email_aktivieren}
            </label>
          </div>
          <div className="formular-feld">
            <label htmlFor="email-server">{t.smtp_server}</label>
            <input
              id="email-server"
              type="text"
              value={config.email_smtp_host}
              onChange={(e) => setConfig({ ...config, email_smtp_host: e.target.value })}
              placeholder="smtp.gmail.com"
              disabled={!config.email_enabled}
            />
          </div>
          <div className="formular-feld">
            <label htmlFor="email-port">{t.smtp_port}</label>
            <input
              id="email-port"
              type="number"
              value={config.email_smtp_port}
              onChange={(e) => setConfig({ ...config, email_smtp_port: Number(e.target.value) })}
              disabled={!config.email_enabled}
            />
          </div>
          <div className="formular-feld">
            <label>
              <input
                type="checkbox"
                checked={config.email_smtp_use_tls}
                onChange={(e) => setConfig({ ...config, email_smtp_use_tls: e.target.checked })}
                disabled={!config.email_enabled}
              />{" "}
              {t.starttls}
            </label>
          </div>
          <div className="formular-feld">
            <label htmlFor="email-from">{t.email_von}</label>
            <input
              id="email-from"
              type="email"
              value={config.email_from}
              onChange={(e) => setConfig({ ...config, email_from: e.target.value })}
              placeholder="notifications@example.com"
              disabled={!config.email_enabled}
            />
          </div>
          <div className="formular-feld">
            <label htmlFor="email-recipients">{t.email_empfaenger}</label>
            <input
              id="email-recipients"
              type="text"
              value={config.email_recipients}
              onChange={(e) => setConfig({ ...config, email_recipients: e.target.value })}
              placeholder="moderator@example.com"
              disabled={!config.email_enabled}
            />
            <p className="hinweistext">{t.email_empfaenger_hinweis}</p>
          </div>
          <div className="formular-feld">
            <label htmlFor="email-user">{t.benutzername}</label>
            <input
              id="email-user"
              type="text"
              value={config.email_smtp_user}
              onChange={(e) => setConfig({ ...config, email_smtp_user: e.target.value })}
              placeholder="user@gmail.com"
              disabled={!config.email_enabled}
            />
          </div>
          <div className="formular-feld">
            <label htmlFor="email-pass">{t.passwort}</label>
            <input
              id="email-pass"
              type="password"
              value={config.email_smtp_password}
              onChange={(e) => setConfig({ ...config, email_smtp_password: e.target.value })}
              placeholder="••••••••"
              disabled={!config.email_enabled}
              autoComplete="off"
            />
          </div>
          <div className="formular-feld">
            <label>
              <input
                type="checkbox"
                checked={config.email_pdf_bei_abschluss}
                onChange={(e) => setConfig({ ...config, email_pdf_bei_abschluss: e.target.checked })}
                disabled={!config.email_enabled}
              />{" "}
              {t.email_pdf_einsatz}
            </label>
          </div>
          <div className="formular-feld">
            <label>
              <input
                type="checkbox"
                checked={config.email_pdf_bei_dienstbuch_abschluss}
                onChange={(e) =>
                  setConfig({ ...config, email_pdf_bei_dienstbuch_abschluss: e.target.checked })
                }
                disabled={!config.email_enabled}
              />{" "}
              {t.email_pdf_dienstbuch}
            </label>
          </div>
          <button
            type="button"
            className="sekundaer"
            onClick={testmailSenden}
            disabled={testmailLaeuft || !config.email_enabled}
          >
            {testmailLaeuft ? t.testmail_sendet : t.testmail_senden}
          </button>
          {testmailErgebnis && <p style={{ fontSize: "0.85rem" }}>{testmailErgebnis}</p>}
        </div>

        {/* Netzwerkdrucker (IPP) – Fallback/Immer-Druck für die Abschluss-PDFs */}
        <div className="karte">
          <h2>{t.drucker_titel}</h2>
          <p style={{ fontSize: "0.85rem", color: "var(--farbe-text-mute)" }}>
            {t.drucker_hinweis}
          </p>
          <div className="formular-feld">
            <label>
              <input
                type="checkbox"
                checked={config.drucker_aktiv}
                onChange={(e) => setConfig({ ...config, drucker_aktiv: e.target.checked })}
              />{" "}
              {t.drucker_aktivieren}
            </label>
          </div>
          <div className="formular-feld">
            <label htmlFor="drucker-url">{t.drucker_url}</label>
            <input
              id="drucker-url"
              value={config.drucker_ipp_url}
              onChange={(e) => setConfig({ ...config, drucker_ipp_url: e.target.value })}
              placeholder="ipp://drucker.local:631/ipp/print"
              disabled={!config.drucker_aktiv}
              autoComplete="off"
            />
          </div>
          <div className="formular-feld">
            <label>
              <input
                type="checkbox"
                checked={config.drucker_immer_einsatz}
                onChange={(e) => setConfig({ ...config, drucker_immer_einsatz: e.target.checked })}
                disabled={!config.drucker_aktiv}
              />{" "}
              {t.drucker_immer_einsatz}
            </label>
          </div>
          <div className="formular-feld">
            <label>
              <input
                type="checkbox"
                checked={config.drucker_immer_dienstbuch}
                onChange={(e) =>
                  setConfig({ ...config, drucker_immer_dienstbuch: e.target.checked })
                }
                disabled={!config.drucker_aktiv}
              />{" "}
              {t.drucker_immer_dienstbuch}
            </label>
          </div>
          <button
            type="button"
            className="sekundaer"
            onClick={testdruckSenden}
            disabled={testdruckLaeuft || !config.drucker_aktiv}
          >
            {testdruckLaeuft ? t.testdruck_druckt : t.testdruck_senden}
          </button>
          {testdruckErgebnis && <p style={{ fontSize: "0.85rem" }}>{testdruckErgebnis}</p>}
        </div>

        {/* Web Push */}
        <div className="karte">
          <h2>{t.webpush_titel}</h2>
          <div className="formular-feld">
            <label>
              <input
                type="checkbox"
                checked={config.webpush_enabled}
                onChange={(e) => setConfig({ ...config, webpush_enabled: e.target.checked })}
              />{" "}
              {t.webpush_aktivieren}
            </label>
          </div>
          <div className="formular-feld">
            <label htmlFor="wp-public">{t.vapid_public}</label>
            <input
              id="wp-public"
              type="password"
              value={config.webpush_vapid_public}
              onChange={(e) => setConfig({ ...config, webpush_vapid_public: e.target.value })}
              placeholder="BFx..."
              disabled={!config.webpush_enabled}
              autoComplete="off"
            />
          </div>
          <div className="formular-feld">
            <label htmlFor="wp-private">{t.vapid_private}</label>
            <input
              id="wp-private"
              type="password"
              value={config.webpush_vapid_private}
              onChange={(e) => setConfig({ ...config, webpush_vapid_private: e.target.value })}
              placeholder="abc..."
              disabled={!config.webpush_enabled}
              autoComplete="off"
            />
          </div>
          <div className="formular-feld">
            <label htmlFor="wp-subject">{t.vapid_subject}</label>
            <input
              id="wp-subject"
              type="text"
              value={config.webpush_vapid_subject}
              onChange={(e) => setConfig({ ...config, webpush_vapid_subject: e.target.value })}
              placeholder="mailto:admin@example.org"
              disabled={!config.webpush_enabled}
            />
            <p className="hinweistext">
              {t.vapid_keys_hinweis} <code>webpush generate-vapid-keys</code>
            </p>
          </div>
        </div>

        <div className="karte">
          <h2>{t.ereignisse_titel}</h2>
          <p className="text-mute">
            {t.ereignisse_hinweis}
          </p>
          {EREIGNISSE.map((e) => (
            <div className="formular-feld" key={e.feld}>
              <label>
                <input
                  type="checkbox"
                  checked={Boolean(config[e.feld])}
                  onChange={(ev) => setConfig({ ...config, [e.feld]: ev.target.checked })}
                />{" "}
                {e.label}
              </label>
            </div>
          ))}
        </div>

        <button type="submit" disabled={loading}>
          {loading ? t.speichert : t.speichern}
        </button>
      </form>
    </div>
  );
}
