import { Calendar, dateFnsLocalizer, type Event } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { de } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
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

const STANDARD_FARBE = "#6b7280";

interface PlanerKalenderProps {
  termine: PlanTerminOut[];
  onEventKlick: (termin: PlanTerminOut) => void;
}

export function PlanerKalender({ termine, onEventKlick }: PlanerKalenderProps) {
  const events: PlanerEvent[] = termine
    .filter((t) => t.zieldatum)
    .map((t) => {
      const datum = new Date(t.zieldatum as string);
      return {
        title: t.titel,
        start: datum,
        end: datum,
        allDay: true,
        termin: t,
      };
    });

  return (
    <div style={{ height: 600 }}>
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        culture="de"
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
      />
      <p style={{ fontSize: "0.85rem", marginTop: 8 }}>
        Blass/gestrichelt = Entwurf · Kräftig = Bestätigt · Farbe = Kategorie
      </p>
    </div>
  );
}
