import { EventCard } from './EventCard';
import { getEventsForDateAndHour } from '../../hooks/useCalendarEvents';
import type { UnifiedCalendarEvent } from '../../types/calendar';

interface DayViewProps {
  currentDate: Date;
  events: UnifiedCalendarEvent[];
  onEventClick: (event: UnifiedCalendarEvent) => void;
  onDrop: (date: Date, hour: number) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function DayView({ currentDate, events, onEventClick, onDrop }: DayViewProps) {
  return (
    <div className="border border-dark-border bg-dark-card overflow-auto max-h-[500px]">
      {HOURS.map((hour) => {
        const hourEvents = getEventsForDateAndHour(events, currentDate, hour);
        return (
          <div
            key={hour}
            className="flex border-b border-dark-border last:border-b-0"
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(currentDate, hour)}
          >
            <div className="w-14 sm:w-16 shrink-0 border-r border-dark-border px-2 py-2 text-2xs text-terminal-muted text-right">
              {String(hour).padStart(2, '0')}:00
            </div>
            <div className="flex-1 min-h-[40px] p-1 hover:bg-dark-hover/30 transition-colors">
              <div className="space-y-1">
                {hourEvents.map((ev) => (
                  <EventCard
                    key={ev.type === 'personal' ? ev.event.id : ev.paymentId}
                    event={ev}
                    onClick={() => onEventClick(ev)}
                  />
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
