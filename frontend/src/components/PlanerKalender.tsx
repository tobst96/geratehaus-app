import { useMemo, useRef } from "react";
import { Calendar, dateFnsLocalizer, type Event } from "react-big-calendar";
import withDragAndDropRaw, {
  type EventInteractionArgs,
} from "react-big-calendar/lib/addons/dragAndDrop";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { de } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import "./BuchungsKalender.css"; // Gemeinsame Theme-/Dark-Mode-Overrides für react-big-calendar
import type { FeiertagOut, PlanTerminOut } from "../api/types";

// CJS/ESM-Interop-Falle: Im Vite-PRODUKTIONS-Build landet der Default-Export
// des CJS-Addons als { default: fn } im Import-Binding, im Dev-/Vitest-Modus
// direkt als fn. Ohne diese Normalisierung wirft das Modul beim Laden
// "(0, x.default) is not a function" -> weiße Seite nur im deployten Build.
const withDragAndDrop = (
  (withDragAndDropRaw as unknown as { default?: typeof withDragAndDropRaw }).default ??
  withDragAndDropRaw
) as typeof withDragAndDropRaw;

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: de }),
  getDay,
  locales: { de },
});

interface PlanerEvent extends Event {
  termin: PlanTerminOut;
}

const DnDCalendar = withDragAndDrop<PlanerEvent>(Calendar);

const STANDARD_FARBE = "#6b7280";

/** Ergebnis eines Verschiebens im Kalender - Datum immer, Zeiten nur wenn der
 * Drop sie tatsächlich verändert hat (Zeitraster in Wochen-/Tagesansicht). */
export interface TerminVerschiebung {
  zieldatum: Date;
  uhrzeit: string | null;
  endzeit: string | null;
  zeitenGeaendert: boolean;
}

function zeitAusDate(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:00`;
}

interface PlanerKalenderProps {
  termine: PlanTerminOut[];
  /** Feiertage des Jahres - werden als eingefärbter Tages-Hintergrund gezeigt. */
  feiertage?: FeiertagOut[];
  /** Angezeigter Zeitraum (gesteuert von außen, z. B. Jahres-Buttons). */
  datum: Date;
  onDatumWechsel: (datum: Date) => void;
  onEventKlick: (termin: PlanTerminOut) => void;
  /** Klick auf einen freien Tag/Zeitslot - zum direkten Anlegen eines Termins. */
  onSlotKlick?: (datum: Date) => void;
  /** Verschieben eines Termins per Drag&Drop. */
  onTerminVerschoben: (termin: PlanTerminOut, verschiebung: TerminVerschiebung) => void;
  /** Ein von außen (Platzhalter-Liste) gezogenes Element wurde auf dem Kalender
   * fallen gelassen. */
  onVonAussenAbgelegt?: (datum: Date) => void;
  /** Titel des gerade von außen gezogenen Platzhalters (für die Drag-Vorschau). */
  externerDragTitel?: string | null;
}

export function PlanerKalender({
  termine,
  feiertage = [],
  datum,
  onDatumWechsel,
  onEventKlick,
  onSlotKlick,
  onTerminVerschoben,
  onVonAussenAbgelegt,
  externerDragTitel,
}: PlanerKalenderProps) {
  // Direkt nach einem Drag&Drop feuert die Bibliothek zusätzlich onSelectEvent -
  // ohne diese Sperre öffnet sich nach jedem Verschieben sofort der Dialog.
  const zuletztGezogen = useRef(0);

  const feiertagProTag = useMemo(() => {
    const map = new Map<string, string>();
    for (const f of feiertage) map.set(f.datum, f.name);
    return map;
  }, [feiertage]);

  const events: PlanerEvent[] = useMemo(
    () =>
      termine
        .filter((t) => t.zieldatum)
        .map((t) => {
          const start = new Date(`${t.zieldatum}T${t.uhrzeit ?? "00:00:00"}`);
          let ende = start;
          if (t.uhrzeit) {
            ende =
              t.endzeit && t.endzeit > t.uhrzeit
                ? new Date(`${t.zieldatum}T${t.endzeit}`)
                : new Date(start.getTime() + 60 * 60 * 1000);
          }
          const zeitLabel = t.uhrzeit
            ? t.endzeit
              ? `${t.uhrzeit.slice(0, 5)}–${t.endzeit.slice(0, 5)} `
              : `${t.uhrzeit.slice(0, 5)} `
            : "";
          return {
            title: `${zeitLabel}${t.titel}`,
            start,
            end: ende,
            allDay: !t.uhrzeit,
            termin: t,
          };
        }),
    [termine]
  );

  return (
    <div style={{ height: 600 }}>
      <DnDCalendar
        localizer={localizer}
        events={events}
        date={datum}
        onNavigate={onDatumWechsel}
        startAccessor="start"
        endAccessor="end"
        culture="de"
        resizable={false}
        messages={{
          today: "Heute",
          previous: "Zurück",
          next: "Weiter",
          month: "Monat",
          week: "Woche",
          day: "Tag",
          agenda: "Agenda",
          noEventsInRange: "Keine Termine in diesem Zeitraum.",
        }}
        dayPropGetter={(tag) => {
          const t = tag instanceof Date ? tag : new Date(tag);
          const iso = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
          if (!feiertagProTag.has(iso)) return {};
          return { style: { backgroundColor: "rgba(239, 68, 68, 0.12)" } };
        }}
        eventPropGetter={(event) => {
          // Defensiv: das Drag-Vorschau-Event eines von außen gezogenen
          // Platzhalters hat keinen echten termin - ohne Guard crasht der
          // Kalender beim Ziehen (weiße Seite).
          const termin = (event as PlanerEvent).termin as PlanTerminOut | undefined;
          const farbe = termin?.kategorien?.[0]?.farbe ?? STANDARD_FARBE;
          const istEntwurf = !termin || termin.status === "entwurf";
          return {
            style: {
              backgroundColor: farbe,
              opacity: istEntwurf ? 0.55 : 1,
              border: istEntwurf ? "1px dashed #374151" : undefined,
            },
          };
        }}
        onSelectEvent={(event) => {
          if (Date.now() - zuletztGezogen.current < 300) return;
          const termin = (event as PlanerEvent).termin as PlanTerminOut | undefined;
          if (termin) onEventKlick(termin);
        }}
        selectable={!!onSlotKlick}
        onSelectSlot={
          onSlotKlick
            ? (slot) => onSlotKlick(slot.start instanceof Date ? slot.start : new Date(slot.start))
            : undefined
        }
        onEventDrop={(args: EventInteractionArgs<PlanerEvent>) => {
          zuletztGezogen.current = Date.now();
          const termin = args.event.termin as PlanTerminOut | undefined;
          if (!termin) return;
          const start = args.start instanceof Date ? args.start : new Date(args.start);
          const ende = args.end instanceof Date ? args.end : new Date(args.end);

          // In der Wochen-/Tagesansicht ändert der Drop auch die Uhrzeit; in der
          // Monatsansicht (bzw. All-Day-Zeile) bleibt die Zeit unangetastet.
          const dropInsZeitraster = args.isAllDay === false || (!args.isAllDay && !args.event.allDay);
          if (dropInsZeitraster && !args.event.allDay) {
            onTerminVerschoben(termin, {
              zieldatum: start,
              uhrzeit: zeitAusDate(start),
              endzeit: termin.endzeit ? zeitAusDate(ende) : null,
              zeitenGeaendert: true,
            });
          } else {
            onTerminVerschoben(termin, {
              zieldatum: start,
              uhrzeit: null,
              endzeit: null,
              zeitenGeaendert: false,
            });
          }
        }}
        draggableAccessor={(event) => !(event as PlanerEvent).termin?.dienstbuch_id}
        dragFromOutsideItem={
          externerDragTitel
            ? () => {
                // Vollständiges Vorschau-Event - RBC ruft darauf Accessors und
                // eventPropGetter auf; ein Objekt nur mit title crasht dort.
                const jetzt = new Date();
                return {
                  title: `📌 ${externerDragTitel}`,
                  start: jetzt,
                  end: jetzt,
                  allDay: true,
                } as PlanerEvent;
              }
            : undefined
        }
        onDropFromOutside={
          onVonAussenAbgelegt
            ? ({ start }) => {
                zuletztGezogen.current = Date.now();
                onVonAussenAbgelegt(start instanceof Date ? start : new Date(start));
              }
            : undefined
        }
      />
      <p style={{ fontSize: "0.85rem", marginTop: 8 }}>
        Blass/gestrichelt = Entwurf · Kräftig = Bestätigt · Farbe = Kategorie · Rötlicher Tag =
        Feiertag · Klick auf einen freien Tag legt einen Termin an · Verschieben per Ziehen (Maus; am
        Touch-Gerät stattdessen Termin antippen und Datum/Zeit im Dialog ändern) · Platzhalter aus der
        Liste unten auf den Kalender ziehen
      </p>
    </div>
  );
}
