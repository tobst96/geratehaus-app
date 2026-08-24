# EXAMPLES.md

Dieses Dokument enthält wiederverwendbare Implementierungsmuster aus Gerätehaus.app.

## Ziel

Dokumentiere hier ausschließlich allgemeingültige Patterns.

Nicht dokumentieren:

- Einmalige Bugs
- Workarounds
- Projektphasen
- TODOs

## Format

---

## Pattern

### Beschreibung

...

### Backend

-

### Frontend

-

### Warum dieses Pattern?

...

### Wann wiederverwenden?

...

---

# Dokumentierte Patterns

---

## Fachliche Einstellung über ConfigService

### Beschreibung

Jeder fachliche/betriebliche Wert wird als Key in `app_config` gehalten und nur
über `config_service` gelesen/geschrieben – nie als Konstante im Code, nie aus der
`.env`.

### Backend

- Key mit neutralem Default und Typ in `app/services/config_defaults.py` (`DEFAULTS`)
  registrieren.
- Lesen: `await config_service.get(db, "mein_key", default)`.
- Schreiben (im Service): `await config_service.set(db, "mein_key", wert)` –
  invalidiert den Cache automatisch.

### Frontend

- Öffentlich sichtbare Werte über `oeffentliche-konfiguration` / `ConfigContext`,
  Moderator-Einstellungen über die `moderator_einstellungen`-Endpunkte.

### Warum dieses Pattern?

Open-Source-Prinzip: keine org-spezifischen Werte im Code; alle Instanzen
konfigurieren live über den Moderator-Bereich, ohne Neustart/Redeploy.

### Wann wiederverwenden?

Immer wenn ein Wert von Organisation zu Organisation variieren kann oder zur
Laufzeit änderbar sein soll.

---

## Modul mit require_modul_aktiv absichern

### Beschreibung

Ein fachliches Modul ist einzeln aktivierbar, auf der Startseite ein-/ausblendbar
und für den Außenzugriff freischaltbar.

### Backend

- Config-Keys `modul_<name>_aktiv`, `modul_<name>_startseite`,
  `modul_<name>_aussenzugriff` in `config_defaults.py`.
- Router-Endpunkte mit `dependencies=[Depends(require_modul_aktiv("modul_<name>_aktiv"))]`
  absichern (liefert 404 bei deaktiviertem Modul).

### Frontend

- Kachel-Sichtbarkeit an `modul_<name>_startseite`, Route ggf. an `_aktiv` koppeln.

### Warum dieses Pattern?

Einheitliches, vorhersehbares Modulverhalten über die ganze App.

### Wann wiederverwenden?

Bei jedem neuen fachlichen Modul (siehe Skill `new-module`).

---

## Reservierungs-/Token-Flow

### Beschreibung

Kurzlebige, meist einmal verwendbare Aktionen ohne Login laufen immer über einen
Token: erstellen → QR/Token → identifizieren → Vorschau → einlösen (z. B. „Barcode
vergessen", Profilbild-Upload, Mitglied-Login).

### Backend

- Eigenes Token-Modell + Service (Erzeugen, Validieren, Als-genutzt-markieren,
  Ablauf); vorhandene Reservierungs-Services als Vorlage (`*_reservierung_service`).
- Öffentliche Endpunkte im `oeffentlich`- bzw. dedizierten Reservierungs-Router.

### Frontend

- Token-Route (`/eintragen/:token`, `/person-bild/:token`, …) mit Vorschau vor dem
  endgültigen Einlösen.

### Warum dieses Pattern?

Sichere, nachvollziehbare Aktionen ohne Dauer-Login; einheitliche UX über alle
Reservierungsarten.

### Wann wiederverwenden?

Für jede login-lose Aktion mit Personen-/Objektbezug und begrenzter Gültigkeit.

---

## Personen-Serialisierung über personen_zu_out()

### Beschreibung

Personen haben berechnete Felder (z. B. gerundete Gesamtpunkte), die nicht direkt
am ORM-Objekt liegen.

### Backend

- Response nie direkt aus dem `Person`-ORM-Objekt bauen, sondern über
  `stammdaten_service.personen_zu_out(db, personen)` bzw. `person_zu_out(db, person)`.

### Warum dieses Pattern?

Konsistente, vollständige `PersonOut`-Antworten inkl. berechneter Felder; klare
Trennung ORM ↔ Schema.

### Wann wiederverwenden?

In jedem Endpunkt, der Personen zurückgibt.

## PersonEreignis mit optionalem Akteur protokollieren

### Beschreibung

`stammdaten_service.person_ereignis_protokollieren(db, person_id, typ,
beschreibung, akteur_name=None)` hat ein optionales `akteur_name`-Feld (Backlog
Etappe T). Nicht jede Aufrufstelle hat einen sinnvollen Akteur: Selbst-/
Systemereignisse (Kiosk-Selbstidentifikation, automatische PIN-Sperre nach
Fehlversuchen, nächtlicher Inaktivitäts-Job) bleiben bewusst `None` – das ist
korrekt und kein technisches Schulden-Kompromiss.

### Backend

- Handelt ein Gruppenführer/Admin für eine andere Person (Stammdaten ändern,
  PIN setzen, Kanal/Abo ändern, Divera-Vorschlag entscheiden, Dienststunden
  nacherfassen): den Namen aus der Auth-Dependency (`admin.name` /
  `gruppenfuehrer.name`) bis zum Service durchreichen und als `akteur_name`
  übergeben.
- Router-Parameter dafür nicht mit `_` prefixen (sonst ist der Name nicht
  greifbar) – auch wenn der Router-Level-`dependencies=[...]`-Eintrag die
  Berechtigung bereits prüft, kann dieselbe Dependency zusätzlich als Parameter
  gebunden werden; FastAPI cached sie pro Request (kein doppelter Aufruf).
- Selbst-/Systemereignisse (Person handelt an sich selbst, Cronjob) lassen
  `akteur_name` weg (Default `None`) – nicht künstlich befüllen.

### Warum dieses Pattern?

Vermeidet zwei Fehler: (a) das Akteurs-Feld nur für neue Aufrufstellen
einzuführen und dadurch dauerhaft inkonsistent zu bleiben, (b) es überall
zwanghaft zu befüllen, auch wo es keinen echten Akteur gibt (irreführend).

### Wann wiederverwenden?

Bei jeder neuen `PersonEreignis`-Aufrufstelle, die durch eine handelnde
Gruppenführer-/Admin-Aktion ausgelöst wird.
