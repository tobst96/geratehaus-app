# Benachrichtigungen

Zentraler Dispatch: `app/services/notifier_service.py`. Kanal-Adapter in
`app/services/notifier/`. Übergeordnet: `.claude/architecture.md`.

## Grundprinzip

Domain-Services (Einsatz, Dienstbuch, Buchung, Dienststunden) rufen **ausschließlich**
`notifier_service.benachrichtige(...)` auf und kennen die Kanäle nicht. Welche
Ereignisse feuern und welche Kanäle aktiv sind, kommt komplett aus `app_config`
(Moderator-Bereich), nie aus der `.env`.

```python
await notifier_service.benachrichtige(
    db,
    "benachrichtigung_neuer_einsatz",   # Ereignis-Schlüssel (app_config-Bool)
    titel=einsatz.titel,                # Platzhalter für die Textvorlage
)
```

Ablauf in `benachrichtige()`:
1. Ereignis in `app_config` deaktiviert → return (nichts senden).
2. Textvorlage (`benachrichtigung_text_*`) laden und mit `**platzhalter` füllen
   (ungültige Platzhalter → Warnung, Rohtext).
3. An alle aktiven Kanäle senden; Fehler eines Kanals werden geloggt, nicht
   propagiert. `ausschluss_kanaele` lässt einzelne Kanäle aus (z. B. wenn ein
   Aufrufer die Mail mit PDF-Anhang separat sendet → keine Doppel-Mail).

## Ereignisse (`benachrichtigung_*`)

| Ereignis-Key | Auslöser | Textvorlage / Platzhalter |
| --- | --- | --- |
| `benachrichtigung_neuer_einsatz` | Einsatz abgeschlossen | `{titel}` |
| `benachrichtigung_divera_alarm` | neuer Divera-Alarm | `{titel}` |
| `benachrichtigung_neues_dienstbuch` | neues Dienstbuch | `{titel}` |
| `benachrichtigung_buchungsanfrage` | neue Buchungsanfrage | `{fahrzeug}, {von}, {bis}, {zweck}` |
| `benachrichtigung_schwellenwert_ueberschreitung` | Dienststunden-Schwellenwert | `{person}, {funktion}, {summe}, {schwellenwert}` |
| `benachrichtigung_person_inaktiv` | Person wird bald gelöscht | `{person}, {tage_inaktiv}` |

Weitere Textvorlagen ohne eigenen Ein/Aus-Schalter: `benachrichtigung_text_barcode_mail`,
`benachrichtigung_text_buchung_genehmigt`, `benachrichtigung_text_buchung_abgelehnt`.

## Kanäle (`app/services/notifier/`)

Ein Kanal ist aktiv, wenn sein `notifier_<kanal>_aktiv`-Flag gesetzt ist:

| Kanal | Aktiv-Flag | Zugangsdaten (app_config) |
| --- | --- | --- |
| `TelegramNotifier` | `notifier_telegram_aktiv` | `notifier_telegram_bot_token`, `notifier_telegram_chat_ids` |
| `EmailNotifier` | `notifier_email_aktiv` | `notifier_email_smtp_host/port/user/password/use_tls`, `notifier_email_from`, `notifier_email_recipients` |
| `WebPushNotifier` | `notifier_webpush_aktiv` | `notifier_webpush_vapid_public_key/private_key/subject` |

- E-Mails werden im HTML-Design der eingestellten Website gerendert
  (`email_template_service`, Templates in `app/templates/email`).
- Optionaler PDF-Anhang bei Einsatz-/Dienstbuch-Abschluss:
  `notifier_email_pdf_bei_abschluss`, `notifier_email_pdf_bei_dienstbuch_abschluss`.

## Regeln

- Neue Benachrichtigungen nur über `benachrichtige()`, nie direkt einen Kanal
  ansprechen.
- Neue Ereignisse: `benachrichtigung_<x>`-Bool **und** `benachrichtigung_text_<x>`
  in `config_defaults.py` anlegen und in `EREIGNIS_BETREFF` / `EREIGNIS_VORLAGE`
  ergänzen.
