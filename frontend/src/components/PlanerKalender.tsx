import { useMemo } from "react";
import { Calendar, dateFnsLocalizer, type Event } from "react-big-calendar";
import withDragAndDrop, {
  type EventInteractionArgs,
} from "react-big-calendar/lib/addons/dragAndDrop";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { de } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import "./BuchungsKalender.css"; // Gemeinsame Theme-/Dark-Mode-Overrides für react-big-calendar
import type { PlanTerminOut } from "../api/types";

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

function terminStart(t: PlanTerminOut): Date {
  const basis = new Date(`${t.zieldatum}T${t.uhrzeit ?? "00:00:00"}`);
  return basis;
}

interface PlanerKalenderProps {
  termine: PlanTerminOut[];
  onEventKlick: (termin: PlanTerminOut) => void;
  /** Klick auf einen freien Tag/Zeitslot - zum direkten Anlegen eines Termins. */
  onSlotKlick?: (datum: Date) => void;
  /** Verschieben eines Termins per Drag&Drop auf ein anderes Datum. */
  onTerminVerschoben: (termin: PlanTerminOut, neuesDatum: Date) => void;
  /** Ein von außen (Platzhalter-Liste) gezogenes Element wurde auf dem Kalender
   * fallen gelassen. */
  onVonAussenAbgelegt?: (datum: Date) => void;
  /** Titel des gerade von außen gezogenen Platzhalters (für die Drag-Vorschau). */
  externerDragTitel?: string | null;
}

export function PlanerKalender({
  termine,
  onEventKlick,
  onSlotKlick,
  onTerminVerschoben,
  onVonAussenAbgelegt,
  externerDragTitel,
}: PlanerKalenderProps) {
  const events: PlanerEvent[] = useMemo(
    () =>
      termine
        .filter((t) => t.zieldatum)
        .map((t) => {
          const start = terminStart(t);
          const ende = t.uhrzeit ? new Date(start.getTime() + 60 * 60 * 1000) : start;
          return {
            title: t.uhrzeit ? `${t.uhrzeit.slice(0, 5)} ${t.titel}` : t.titel,
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
        eventPropGetter={(event) => {
          const termin = (event as PlanerEvent).termin;
          const farbe = termin.kategorien[0]?.farbe ?? STANDARD_FARBE;
          const istEntwurf = termin.status === "entwurf";
          return {
            style: {
              backgroundColor: farbe,
              opacity: istEntwurf ? 0.55 : 1,
              border: istEntwurf ? "1px dashed #374151" : undefined,
            },
          };
        }}
        onSelectEvent={(event) => onEventKlick((event as PlanerEvent).termin)}
        selectable={!!onSlotKlick}
        onSelectSlot={
          onSlotKlick
            ? (slot) => onSlotKlick(slot.start instanceof Date ? slot.start : new Date(slot.start))
            : undefined
        }
        onEventDrop={(args: EventInteractionArgs<PlanerEvent>) => {
          const start = args.start instanceof Date ? args.start : new Date(args.start);
          onTerminVerschoben(args.event.termin, start);
        }}
        draggableAccessor={(event) => !(event as PlanerEvent).termin.dienstbuch_id}
        dragFromOutsideItem={
          externerDragTitel ? () => ({ title: `📌 ${externerDragTitel}` }) as PlanerEvent : undefined
        }
        onDropFromOutside={
          onVonAussenAbgelegt
            ? ({ start }) => onVonAussenAbgelegt(start instanceof Date ? start : new Date(start))
            : undefined
        }
      />
      <p style={{ fontSize: "0.85rem", marginTop: 8 }}>
        Blass/gestrichelt = Entwurf · Kräftig = Bestätigt · Farbe = Kategorie · Klick auf einen freien
        Tag legt einen Termin an · Termine lassen sich per Ziehen verschieben, Platzhalter aus der
        Liste unten auf den Kalender ziehen
      </p>
    </div>
  );
}
