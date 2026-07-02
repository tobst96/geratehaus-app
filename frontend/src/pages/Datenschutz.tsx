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
        <h2>Name &amp; Namensabweichungen</h2>
        <p>
          Dein Name wird in einem Cookie auf deinem Gerät gespeichert, damit er bei jedem Besuch
          vorausgefüllt ist. Weicht der eingetragene Name vom zuvor gespeicherten Namen ab, wird
          diese Abweichung serverseitig protokolliert, damit Moderatoren Unstimmigkeiten in den
          Aufzeichnungen nachvollziehen können.
        </p>
      </div>

      <div className="karte">
        <h2>PIN für den Außenzugriff</h2>
        <p>
          Wenn du einen PIN einrichtest, wird dieser ausschließlich als Hash (nicht im Klartext) in
          der Datenbank gespeichert. Der PIN ermöglicht dir, von außerhalb des Gerätehauses auf den
          Fahrzeugkalender und deine eigenen Dienststunden zuzugreifen.
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
        <h2>Aufbewahrung &amp; Archivierung</h2>
        <p>
          Einsätze und Dienstbücher werden nach einem von der Organisation festgelegten Zeitraum
          automatisch archiviert. Archivierte Einträge bleiben für Moderatoren einsehbar, werden
          Kameraden aber nicht mehr in den laufenden Listen angezeigt.
        </p>
      </div>
    </div>
  );
}
