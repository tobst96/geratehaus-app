import { useConfig } from "../context/ConfigContext";

export function Datenschutz() {
  const { config } = useConfig();

  return (
    <div>
      <h1>Datenschutzhinweis</h1>

      <div className="karte">
        <h2>Verantwortliche Stelle</h2>
        <p>
          Verantwortlich für die Datenverarbeitung im Rahmen dieser Anwendung ist{" "}
          <strong>{config?.organisation_name ?? "die betreibende Organisation"}</strong>, die diese
          Instanz von Gerätehaus.app selbst betreibt. Kontaktdaten erhältst du direkt von deiner
          Organisation.
        </p>
      </div>

      <div className="karte">
        <h2>Standortdaten</h2>
        <p>
          Bestimmte Funktionen sind nur im Gerätehaus nutzbar. Dazu wird dein Standort über die
          Geolocation-Funktion deines Browsers einmalig je Vorgang an den Server übertragen und mit
          den hinterlegten Koordinaten des Gerätehauses abgeglichen. Der Standort wird nicht
          dauerhaft gespeichert.
        </p>
      </div>

      <div className="karte">
        <h2>Name</h2>
        <p>
          Dein Name wird in einem Cookie auf deinem Gerät gespeichert, damit er bei jedem Besuch
          vorausgefüllt ist.
        </p>
      </div>

      <div className="karte">
        <h2>Anmeldung per Name/E-Mail, PIN &amp; Passwort</h2>
        <p>
          Am Kiosk-Tablet im Gerätehaus identifizierst du dich über die Auswahl deines Namens und
          deinen persönlichen PIN (oder per Barcode). Für den persönlichen Login auf deinem eigenen
          Gerät (Handy/App) meldest du dich mit deiner E-Mail-Adresse und einem persönlichen
          Passwort an. PIN und Passwort werden ausschließlich als Hash (nicht im Klartext) in der
          Datenbank gespeichert und dienen dazu, dir deine Eintragungen und den Zugriff auf
          freigegebene Module (z. B. Fahrzeugkalender, eigene Dienststunden) eindeutig zuzuordnen.
        </p>
        <p>
          Dein Passwort legst du über einen Link fest, den du dir an deine hinterlegte
          E-Mail-Adresse schicken lassen kannst.
        </p>
        <p>
          Hast du noch keinen PIN gesetzt, kannst du dir einen Link zum Setzen deines PINs an deine
          hinterlegte E-Mail-Adresse schicken lassen. Ist keine E-Mail hinterlegt, wird stattdessen
          eine Freigabe-Anfrage an die Gruppenführer deiner Organisation gesendet, die daraufhin eine
          E-Mail-Adresse (und auf Wunsch direkt einen PIN) für dich hinterlegen können. Solange kein
          PIN gesetzt ist, kann an eine hinterlegte E-Mail-Adresse in einstellbaren Abständen eine
          Erinnerung zum Setzen des PINs versendet werden.
        </p>
        <p>
          Die Identifikation selbst bleibt auch ohne gesetzten PIN möglich – der Vorgang wird dann in
          den betroffenen Listen/PDFs sowie in deinem Verlauf (sichtbar für Gruppenführer) als „ohne
          PIN" vermerkt.
        </p>
        <p>
          Alternativ kann deine Organisation die Identifikation per persönlichem <strong>Barcode</strong>
          aktivieren; in diesem Fall identifizierst du dich am Kiosk durch Scannen deines Barcodes
          statt per Name und PIN.
        </p>
        <p>
          Für Gruppenführer- und Admin-Zugänge steht optional eine
          <strong> Zwei-Faktor-Authentisierung</strong> zur Verfügung (in Einstellungen aktivierbar,
          standardmäßig aus): Beim Login wird zusätzlich zum Passwort ein einmaliger Anmelde-Code an
          die hinterlegte E-Mail-Adresse geschickt. Bei der Einrichtung werden zudem einmalig
          <strong> Recovery-Codes</strong> angezeigt (als Hash gespeichert), die bei fehlendem
          E-Mail-Zugriff als Ersatzcode dienen. Auf Wunsch kann ein Gerät für 30 Tage als
          vertrauenswürdig markiert werden, sodass dort kein erneuter Code nötig ist (technische
          Kennung in einem Cookie). Von einem bereits per E-Mail+Passwort angemeldeten Mitglied mit
          Gruppenführer-/Admin-Rechten aus ist der Wechsel in den entsprechenden Bereich ohne erneute
          Passworteingabe möglich – eine aktivierte Zwei-Faktor-Prüfung bleibt dabei unverändert
          bestehen.
        </p>
      </div>

      <div className="karte">
        <h2>Profilbilder</h2>
        <p>
          Zu jeder Person kann optional ein <strong>Profilbild</strong> hinterlegt werden; es dient
          der Wiedererkennung (z.&nbsp;B. bei der Sitzplatz-/Anwesenheitszuordnung am Kiosk oder im
          „Barcode vergessen"-Ablauf). Beim Hochladen wird das Bild serverseitig neu kodiert, wobei
          enthaltene <strong>Metadaten (z.&nbsp;B. Aufnahmeort, Kamera- und Zeitangaben) entfernt</strong>
          werden. Profilbilder sind <strong>nicht öffentlich abrufbar</strong> – sie werden nur
          berechtigten Nutzern über kurzlebige, signierte Links ausgeliefert. Ein vorhandenes Bild
          wird beim Ersetzen automatisch gelöscht.
        </p>
      </div>

      <div className="karte">
        <h2>Benachrichtigungen</h2>
        <p>
          Für jede Person können Benachrichtigungskanäle hinterlegt werden, über die sie zu
          Ereignissen (z. B. neuer Einsatz, neues Dienstbuch, Buchungsanfrage) informiert wird. Je
          nach Konfiguration deiner Organisation sind das:
        </p>
        <ul>
          <li>
            <strong>E-Mail:</strong> deine E-Mail-Adresse wird gespeichert, um dir Nachrichten und
            deinen persönlichen Barcode zuzusenden.
          </li>
          <li>
            <strong>Telegram:</strong> falls du diesen Kanal nutzt, wird deine Telegram-Chat-ID
            gespeichert, um Nachrichten über den von der Organisation betriebenen Telegram-Bot zu
            senden (Übermittlung an Telegram als externen Dienst).
          </li>
          <li>
            <strong>Web-Push:</strong> falls aktiviert und im Browser zugelassen, wird eine
            technische Abonnement-Kennung (kein Name, keine Standortdaten) gespeichert. Die
            Berechtigung kann jederzeit in den Browser-Einstellungen widerrufen werden.
          </li>
        </ul>
        <p>
          Welche Ereignisse du empfängst, ist pro Person einstellbar; Benachrichtigungen werden nur
          an die jeweils dafür freigegebenen Kanäle gesendet.
        </p>
      </div>

      <div className="karte">
        <h2>Divera-24/7-Anbindung</h2>
        <p>
          Nutzt deine Organisation die optionale Anbindung an den externen Alarmierungsdienst
          <strong> Divera&nbsp;24/7</strong>, ruft diese Instanz darüber Einsatz- und Personendaten
          ab und speichert sie im System: Alarme werden als Einsätze übernommen (inkl. Stichwort,
          Zeitpunkt sowie – sofern von Divera geliefert – Einsatzadresse und Meldungstext), und
          Mitglieder aus dem Divera-Verband können als Personen vorgeschlagen und übernommen werden
          (Name und, sofern vorhanden, E-Mail-Adresse; zur Zuordnung wird die Divera-Benutzer-ID
          gespeichert). Der Datenabruf erfolgt gegenüber Divera mit einem von der Organisation
          hinterlegten Zugangsschlüssel; es gelten zusätzlich die Datenschutzbestimmungen von Divera.
        </p>
      </div>

      <div className="karte">
        <h2>Formulare</h2>
        <p>
          Sofern das Formular-Modul aktiv ist, kann die Organisation eigene Formulare bereitstellen.
          Beim Absenden werden die eingegebenen Antworten gespeichert; je nach Formular kann eine
          Anmeldung erforderlich sein, wodurch die Einreichung der jeweiligen Person zugeordnet wird.
          Die Inhalte können personenbezogene Daten enthalten – abhängig davon, welche Angaben das
          jeweilige Formular abfragt (inkl. optionaler Datei-Uploads; bei Bild-Uploads werden
          enthaltene Metadaten entfernt). Zu jedem Formular kann eine
          E-Mail-Benachrichtigung mit den übermittelten Antworten an eine hinterlegte Adresse versendet
          werden. Formulare können zudem eine ausdrückliche Einwilligung vor dem Absenden verlangen und
          eine Aufbewahrungsfrist haben, nach der die Einreichungen automatisch gelöscht werden. Zugriff
          auf die Einreichungen haben nur Administratoren bzw. ausdrücklich freigegebene Gruppenführer.
        </p>
      </div>

      <div className="karte">
        <h2>Pressebericht (optional)</h2>
        <p>
          Ist das optionale Pressebericht-Modul aktiv, wird zu einem Einsatz automatisch ein
          Pressebericht als PDF erzeugt und per E-Mail an die Personen versendet, die dieses Ereignis
          in ihren Benachrichtigungskanälen abonniert haben. Welche Angaben der Bericht enthält, legt
          die Organisation fest – je nach Einstellung u.&nbsp;a. Einsatz-Grunddaten, die Zahl der
          beteiligten Personen und/oder deren <strong>Namen</strong> sowie die eingesetzten Fahrzeuge
          mit Besatzung. Der Bericht kann damit personenbezogene Daten enthalten. Sofern das
          Objektspeicher-Modul aktiv ist, wird er zusätzlich im Einsatz-Ordner abgelegt (siehe
          „Objektspeicher für Dokumente"). Der Versand erfolgt – je nach Einstellung – sofort beim
          Abschluss des Einsatzes, eine bestimmte Anzahl Stunden danach oder täglich zu einer festen
          Uhrzeit.
        </p>
      </div>

      <div className="karte">
        <h2>ELW-Upload (optional)</h2>
        <p>
          Ist das optionale ELW-Modul aktiv, wird bei jeder Einsatz-Anlage eine E-Mail mit einem
          Login-losen Upload-Link an eine fest hinterlegte Adresse (Einsatzleitwagen) gesendet. Über
          diesen Link können – ohne Anmeldung, aber nur solange der Einsatz offen ist – Dateien
          (Bilder/PDF) zum Einsatz hochgeladen werden. Diese Dateien werden im Einsatz-Ordner des
          Objektspeichers abgelegt und können personenbezogene Daten enthalten; jeder Upload wird in
          der Einsatz-Timeline protokolliert. Der Link ist über ein signiertes Token abgesichert und
          verliert seine Gültigkeit mit dem Abschluss des Einsatzes.
        </p>
      </div>

      <div className="karte">
        <h2>Aufbewahrung &amp; Archivierung</h2>
        <p>
          Einsätze und Dienstbücher werden nach einem von der Organisation festgelegten Zeitraum
          automatisch archiviert. Archivierte Einträge bleiben für Gruppenführer einsehbar, werden
          Kameraden aber nicht mehr in den laufenden Listen angezeigt.
        </p>

        <h2>Datensicherung (Backups)</h2>
        <p>
          Zur Ausfallsicherung kann die Organisation regelmäßige Backups erstellen. Ein Backup enthält
          <strong> alle Daten der Anwendung</strong> – einschließlich personenbezogener Daten (Namen,
          E-Mail-Adressen, Profilbilder sowie die als Hash gespeicherten Zugangs-/PIN-Daten). Backups
          werden <strong>verschlüsselt</strong> und können – je nach Konfiguration der Organisation –
          zusätzlich an einem externen Ort gespeichert werden (z. B. WebDAV/Nextcloud, S3-kompatibler
          Speicher, SFTP oder als E-Mail-Anhang an die Administratoren). Sofern dabei externe
          Dienstleister genutzt werden, geschieht dies im Auftrag der verantwortlichen Stelle.
        </p>

        <h2>Objektspeicher für Dokumente (optional)</h2>
        <p>
          Nutzt die Organisation das optionale Objektspeicher-Modul, werden erzeugte Dokumente
          automatisch dort abgelegt: je Einsatz ein Ordner mit den Einsatzdaten und dem Einsatzbericht
          (PDF), Dienstbücher als PDF. Diese Dokumente können personenbezogene Daten enthalten (z. B.
          Namen der Teilnehmenden). Der Objektspeicher kann lokal betrieben oder – je nach Konfiguration
          – bei einem externen Anbieter geführt werden; externe Anbieter handeln als Auftragsverarbeiter
          der verantwortlichen Stelle.
        </p>

        <h2>Fehler-Monitoring (Sentry)</h2>
        <p>
          Sofern die Organisation zugestimmt hat (Einstellung „Fehlerberichte", standardmäßig
          <strong> aus</strong>), werden technische Fehler- und Absturzdaten der Anwendung an das
          Monitoring-Werkzeug <strong>Sentry</strong> übermittelt, um Störungen zu erkennen und zu
          beheben. Übertragen werden ausschließlich <strong>technische Angaben</strong> (Fehlermeldung,
          Programmstelle/Stacktrace, aufgerufener Pfad, Browser-/Servertyp, Version); es werden
          <strong> keine personenbezogenen Zusatzdaten</strong> wie IP-Adresse, Cookies oder
          Formularinhalte mitgesendet. Die Daten werden in einem Rechenzentrum in der
          <strong> EU (Deutschland)</strong> verarbeitet; der Anbieter handelt als Auftragsverarbeiter.
        </p>
        <p>
          In der <strong>Beta-Version</strong> der Anwendung ist zusätzlich <strong>Session Replay</strong>
          aktiv: Dabei wird der Ablauf der Bedienung (Klicks/Seitenwechsel) aufgezeichnet, um Fehler
          nachvollziehen zu können. Angezeigte <strong>Texte werden maskiert</strong> und
          <strong> Medien/Bilder blockiert</strong>, sodass keine Namen, PINs oder Bilder im Replay
          sichtbar sind. In der regulären (Produktiv-)Version ist Session Replay
          <strong> deaktiviert</strong>.
        </p>
      </div>
    </div>
  );
}
