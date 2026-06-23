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
        <h2>Push-Benachrichtigungen</h2>
        <p>
          Falls deine Organisation Web-Push-Benachrichtigungen aktiviert hat und du diese in deinem
          Browser zulässt, wird eine technische Abonnement-Kennung (kein Name, keine Standortdaten)
          gespeichert, um dir Benachrichtigungen zu Einsätzen, Dienstbüchern und Buchungen senden zu
          können. Du kannst die Berechtigung jederzeit in den Browser-Einstellungen widerrufen.
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
