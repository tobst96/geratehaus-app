import { Calendar, dateFnsLocalizer, type Event } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { de } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import type { BuchungOut } from "../api/types";

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: de }),
  getDay,
  locales: { de },
});

interface BuchungsEvent extends Event {
  buchung: BuchungOut;
}

const STATUS_FARBE: Record<string, string> = {
  ausstehend: "#e6a700",
  genehmigt: "#2e7d32",
  abgelehnt: "#b00020",
  zurueckgezogen: "#888",
};

function statusOderVergangen(buchung: BuchungOut): string {
  if (new Date(buchung.bis) < new Date()) return "vergangen";
  return buchung.status;
}

interface BuchungsKalenderProps {
  buchungen: BuchungOut[];
  onEventKlick?: (buchung: BuchungOut) => void;
}

export function BuchungsKalender({ buchungen, onEventKlick }: BuchungsKalenderProps) {
  const events: BuchungsEvent[] = buchungen.map((b) => ({
    title: `${b.fahrzeug_name}: ${b.zweck}`,
    start: new Date(b.von),
    end: new Date(b.bis),
    buchung: b,
  }));

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
          noEventsInRange: "Keine Buchungen in diesem Zeitraum.",
        }}
        eventPropGetter={(event) => {
          const status = statusOderVergangen((event as BuchungsEvent).buchung);
          return {
            style: {
              backgroundColor: status === "vergangen" ? "#444" : STATUS_FARBE[status],
              opacity: status === "vergangen" ? 0.6 : 1,
            },
          };
        }}
        onSelectEvent={(event) => onEventKlick?.((event as BuchungsEvent).buchung)}
      />
      <p style={{ fontSize: "0.85rem", marginTop: 8 }}>
        🟡 Ausstehend · 🟢 Genehmigt · 🔴 Abgelehnt · ⚫ Vergangen
      </p>
    </div>
  );
}
