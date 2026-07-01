# Frontend

React 18 + TypeScript + Vite PWA. Einstieg `src/main.tsx`, Routing `src/App.tsx`.
Übergeordnet: `.claude/architecture.md`.

## Verzeichnisstruktur (`frontend/src/`)

| Ordner/Datei | Inhalt |
| --- | --- |
| `api/` | Typisierter HTTP-Client (`client.ts`) + je Domäne ein Modul; `types.ts` zentrale Typen |
| `components/` | Wiederverwendbare Bausteine + Route-Guards/Gates |
| `context/` | `AuthContext` (Moderator-Login), `ConfigContext` (öffentliche Konfiguration) |
| `hooks/` | `useTheme`, `useBarcodeSound`, `useMitgliedModus` |
| `pages/` | Seiten nach Domäne gruppiert (siehe unten) |
| `utils/` | Helfer (`eintragungssperre`, `oeffentlicheUrl`) |

## Seitenstruktur (`src/pages/`)

- Domänen-Unterordner: `einsatztagebuch/`, `dienstbuch/`, `dienststunden/`,
  `fahrzeugbuchung/`, `fahrzeug/`, `mitglied/`, `moderator/`, `setup/`.
- Kiosk-/öffentliche Seiten direkt in `pages/` (`KioskHome`, `LandingPage`,
  `ManuelleEintragung`, `PersonBildHochladen`, `Datenschutz`, …).
- Moderator-Bereich in `pages/moderator/` (Dashboard, Listen, Stammdaten, Personal,
  Einstellungen, NotifierEinstellungen, PunkteEinstellungen, BarcodeGenerator,
  KioskGeraete, Update, Detailseiten …).

## API-Client (`src/api/client.ts`)

- Basis-URL fest `"/api/v1"` (Nginx/Vite-Proxy leitet weiter).
- Helfer `apiGet/apiPost/apiPut/apiPatch/apiDelete/apiUpload`.
- Moderator-JWT im `localStorage` (`moderator_token`), automatisch als
  `Authorization: Bearer` gesetzt; `credentials: "include"` für Cookies
  (Kiosk-/PIN-Session).
- Fehler werfen `ApiError` mit `status` und `detail`.
- Neue Endpunkte immer über eine Funktion in einem `api/`-Modul kapseln, nicht
  direkt `fetch` in Komponenten.

## Routing & Zugriffsschutz (`src/App.tsx`)

- Alles in `SetupGate` gewrappt (leitet vor abgeschlossenem Setup auf den Wizard).
- Moderator-Bereich unter `/moderator` via `ModeratorRoute`; admin-only Unterseiten
  zusätzlich in `AdminRoute` geschachtelt (z. B. Personal, Stammdaten, Barcodes,
  Kiosk-Geräte, Benachrichtigungen, Einstellungen, Update).
- `punkte` ist bewusst für jeden Moderator erreichbar (Gruppenführer dürfen
  Belohnungen vergeben); die Regel-Einstellungen bleiben in der Seite admin-only.
- Token-Routen für Kiosk/öffentliche Flows: `/kiosk/:token`,
  `/mitglied-anmelden/:token`, `/eintragen/:token`, `/person-bild/:token`, u. a.

## Konventionen

- Bestehende Komponenten/CSS-Klassen wiederverwenden; keine neuen UI-Konzepte ohne
  Notwendigkeit.
- Dark Mode und responsives Verhalten beibehalten; keine unnötigen Inline-Styles.
- Deutschsprachige Bezeichner; keine direkten DB-Annahmen im Frontend – nur über
  die API.
