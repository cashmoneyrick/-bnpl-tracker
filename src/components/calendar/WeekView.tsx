import { EventCard } from './EventCard';
import { getEventsForDateAndHour } from '../../hooks/useCalendarEvents';
import type { UnifiedCalendarEvent } from '../../types/calendar';

interface WeekViewProps {
  currentDate: Date;
  events: UnifiedCalendarEvent[];
  onEventClick: (event: UnifiedCalendarEvent) => void;
  onDrop: (date: Date, hour: number) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function WeekView({ currentDate, events, onEventClick, onDrop }: WeekViewProps) {
  // Get start of week (Sunday)
  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate() + i);
    return day;
  });

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;

  return (
    <div className="border border-dark-border bg-dark-card overflow-auto max-h-[500px]">
      {/* Header */}
      <div className="grid grid-cols-[48px_repeat(7,1fr)] border-b border-dark-border sticky top-0 bg-dark-card z-10">
        <div className="border-r border-dark-border px-1 py-1.5 text-2xs text-terminal-muted text-center">HR</div>
        {weekDays.map((day) => {
          const dayStr = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
          const isToday = dayStr === todayStr;
          return (
            <div key={dayStr} className="border-r border-dark-border last:border-r-0 px-1 py-1.5 text-center">
              <div className="text-2xs text-terminal-muted hidden sm:block">
                {day.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}
              </div>
              <div className="text-2xs text-terminal-muted sm:hidden">
                {day.toLocaleDateString('en-US', { weekday: 'narrow' })}
              </div>
              <div className={`text-xs ${isToday ? 'text-terminal-amber font-bold' : 'text-terminal-text'}`}>
                {day.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Hour rows */}
      {HOURS.map((hour) => (
        <div key={hour} className="grid grid-cols-[48px_repeat(7,1fr)]">
          <div className="border-r border-b border-dark-border px-1 py-1 text-2xs text-terminal-muted text-right pr-2">
            {String(hour).padStart(2, '0')}:00
          </div>
          {weekDays.map((day) => {
            const dayStr = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
            const hourEvents = getEventsForDateAndHour(events, day, hour);
            return (
              <div
                key={`${dayStr}-${hour}`}
                className="border-r border-b border-dark-border last:border-r-0 min-h-[32px] p-0.5 hover:bg-dark-hover/30 transition-colors"
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDrop(day, hour)}
              >
                {hourEvents.map((ev) => (
                  <EventCard
                    key={ev.type === 'personal' ? ev.event.id : ev.paymentId}
                    event={ev}
                    onClick={() => onEventClick(ev)}
                    compact
                  />
                ))}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
