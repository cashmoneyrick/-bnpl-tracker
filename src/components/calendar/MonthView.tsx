import { EventCard } from './EventCard';
import { getEventsForDate } from '../../hooks/useCalendarEvents';
import type { UnifiedCalendarEvent } from '../../types/calendar';

interface MonthViewProps {
  currentDate: Date;
  events: UnifiedCalendarEvent[];
  onEventClick: (event: UnifiedCalendarEvent) => void;
  onDrop: (date: Date) => void;
}

const DAY_NAMES_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_NAMES_FULL = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export function MonthView({ currentDate, events, onEventClick, onDrop }: MonthViewProps) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Build 6-week grid
  const firstDay = new Date(year, month, 1);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - startDate.getDay());

  const days: Date[] = [];
  const d = new Date(startDate);
  for (let i = 0; i < 42; i++) {
    days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;

  return (
    <div className="border border-dark-border bg-dark-card overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-dark-border">
        {DAY_NAMES_FULL.map((name, i) => (
          <div key={name + i} className="border-r border-dark-border last:border-r-0 px-1 py-1.5 sm:py-1 text-center">
            <span className="hidden sm:inline text-2xs text-terminal-muted font-medium">{name}</span>
            <span className="sm:hidden text-xs text-terminal-muted font-medium">{DAY_NAMES_SHORT[i]}</span>
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {days.map((day, idx) => {
          const isCurrentMonth = day.getMonth() === month;
          const dayStr = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
          const isToday = dayStr === todayStr;
          const dayEvents = getEventsForDate(events, day);

          return (
            <div
              key={idx}
              className={`min-h-[60px] sm:min-h-[80px] border-b border-r border-dark-border last:border-r-0 p-0.5 sm:p-1 transition-colors ${
                !isCurrentMonth ? 'bg-dark-bg/50' : ''
              } hover:bg-dark-hover/30`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(day)}
            >
              {/* Day number */}
              <div className="flex items-center justify-center sm:justify-start mb-0.5">
                <span
                  className={`text-xs sm:text-2xs w-5 h-5 sm:w-4 sm:h-4 flex items-center justify-center ${
                    isToday
                      ? 'bg-terminal-amber text-dark-bg font-bold'
                      : isCurrentMonth
                      ? 'text-terminal-text'
                      : 'text-terminal-muted/40'
                  }`}
                >
                  {day.getDate()}
                </span>
              </div>

              {/* Events */}
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map((ev) => (
                  <EventCard
                    key={ev.type === 'personal' ? ev.event.id : ev.paymentId}
                    event={ev}
                    onClick={() => onEventClick(ev)}
                    compact
                  />
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-2xs text-terminal-muted text-center">+{dayEvents.length - 3}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
