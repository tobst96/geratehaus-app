# Modul „Benachrichtigungen"

Zentrale Konfiguration, **wie** und **worüber** die App benachrichtigt. Internes,
**immer aktives** Modul. Zu finden unter **Module → Benachrichtigungen**.

## Kanäle (Transport)

- **E-Mail (SMTP)**: Host, Port, Benutzer, Passwort, TLS, Absender und
  Empfänger-Liste (Admins). „Testmail senden".
- **Telegram**: Bot-Token + Chat-IDs.
- **Web Push (VAPID)**: für Browser-Push (Public/Private Key, Subject).
- Jeder Kanal ist einzeln an-/abschaltbar (Standard: aus).

## Welche Ereignisse benachrichtigen?

Schalter je Ereignistyp – legt fest, ob überhaupt eine Benachrichtigung verschickt
wird:
- Einsatz abgeschlossen
- Neuer Einsatz via Divera angelegt
- Neues Dienstbuch
- Neue Buchungsanfrage
- Dienststunden-Schwellenwert überschritten
- Person inaktiv (wird bald gelöscht)

Zusätzlich: **PDF bei Einsatz-/Dienstbuch-Abschluss** an die Abonnenten anhängen.

## Drei Ebenen (wichtig zu verstehen)

Eine Mail kommt nur an, wenn **alle drei** Ebenen passen:
1. **Global**: Ist der Ereignistyp hier aktiviert? Ist der Kanal (E-Mail) aktiv?
2. **Pro Person**: „Benachrichtigungen aktiv" (Haupt-Schalter im Personal‑Modul)
   und eine hinterlegte E‑Mail.
3. **Abos**: Hat die Person das Ereignis abonniert (Personal‑Detailseite,
   „Welche Benachrichtigungen?")?

Der **E‑Mail‑Kanal einer Person nutzt automatisch deren E‑Mail‑Adresse** – es wird
keine zweite Adresse gepflegt.

## Fehlerberichte / Monitoring

Optional (Einstellungen → Fehlerberichte, Standard aus): echte Code-/Serverfehler
gehen anonym an Sentry (keine Personendaten). Siehe auch
[backup.md](backup.md) für die Backup-Fehler-Mail.
