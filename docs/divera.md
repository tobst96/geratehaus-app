# Modul „Divera 24/7"

Anbindung an Divera 24/7: Alarme werden automatisch zu Einsätzen, optional wird das
Personal abgeglichen. Internes, **an-/abschaltbares** Modul. Zu finden unter
**Module → Divera 24/7**.

## Einrichtung

- **Anbindung aktivieren** und **API-Key/Accesskey** hinterlegen.
- **Modus** wählen:
  - **Polling** – die App fragt alle 5 Minuten neue Alarme ab.
  - **Webhook** – Divera schickt Alarme sofort. Dazu bei Divera die URL
    `https://<deine-instanz>/api/v1/divera/webhook?accesskey=<dein-Accesskey>`
    hinterlegen.
- Änderungen wirken ohne Neustart.

## Alarm → Einsatz

- Neue Alarme werden automatisch als **Einsatz** angelegt (Upsert über die
  Divera-ID, keine Duplikate). Übernommen werden **Adresse**, **Meldung** und
  **Einsatznummer** der Leitstelle.
- Die **Divera-Alarmzeit** wird als Einsatz-Zeitstempel genutzt; die Änderung von
  der Systemzeit auf den Divera-Zeitstempel wird in der Einsatz-Timeline vermerkt.
- Bereits in Divera geschlossene (nachgeholte) Alarme werden direkt als
  abgeschlossen angelegt und lösen keine „neuer Einsatz"-Benachrichtigung aus.

## Personal-Abgleich (optional)

- Ein täglicher Job holt Divera-Personal-Vorschläge (neue Personen,
  E-Mail-Abweichungen) und räumt alte Vorschläge auf. Vorschläge werden im
  Moderator-Bereich bestätigt.

## Hinweis

API-Key/Accesskey sind Geheimnisse – nur Admins haben Zugriff auf das Modul.
