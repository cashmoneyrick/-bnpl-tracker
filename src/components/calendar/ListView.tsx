import { format, parseISO } from 'date-fns';
import { formatCurrency } from '../../utils/currency';
import { CALENDAR_COLORS } from '../../types/calendar';
import type { UnifiedCalendarEvent } from '../../types/calendar';

interface ListViewProps {
  events: UnifiedCalendarEvent[];
  onEventClick: (event: UnifiedCalendarEvent) => void;
}

function getEventDate(event: UnifiedCalendarEvent): Date {
  return event.type === 'personal' ? new Date(event.event.startTime) : parseISO(event.dueDate);
}

function getEventSortKey(event: UnifiedCalendarEvent): number {
  return getEventDate(event).getTime();
}

export function ListView({ events, onEventClick }: ListViewProps) {
  const sorted = [...events].sort((a, b) => getEventSortKey(a) - getEventSortKey(b));

  // Group by date
  const grouped = new Map<string, UnifiedCalendarEvent[]>();
  for (const event of sorted) {
    const date = getEventDate(event);
    const key = format(date, 'yyyy-MM-dd');
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(event);
  }

  if (sorted.length === 0) {
    return (
      <div className="border border-dark-border bg-dark-card p-6 text-center">
        <span className="text-terminal-muted text-2xs">NO EVENTS</span>
      </div>
    );
  }

  return (
    <div className="border border-dark-border bg-dark-card divide-y divide-dark-border">
      {[...grouped.entries()].map(([dateKey, dayEvents]) => (
        <div key={dateKey}>
          {/* Date header */}
          <div className="px-3 py-1.5 bg-dark-bg/50">
            <span className="terminal-label">
              {format(parseISO(dateKey), 'EEEE, MMM d, yyyy').toUpperCase()}
            </span>
          </div>

          {/* Events */}
          <div className="divide-y divide-dark-border/50">
            {dayEvents.map((ev) => {
              if (ev.type === 'payment') {
                const isPaid = ev.status === 'paid';
                const isOverdue = ev.status === 'overdue';
                return (
                  <div
                    key={ev.paymentId}
                    className={`flex items-center gap-3 px-3 py-2.5 sm:py-2 cursor-pointer row-glow transition-colors ${
                      isPaid ? 'opacity-40' : ''
                    }`}
                    onClick={() => onEventClick(ev)}
                  >
                    <span className="w-2 h-2 shrink-0" style={{ backgroundColor: ev.platformColor }} />
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs sm:text-2xs text-white font-medium truncate ${isPaid ? 'line-through' : ''}`}>
                        {ev.storeName}
                      </div>
                      <div className="text-2xs text-terminal-muted">
                        {ev.installmentNumber}/{ev.totalInstallments}
                        {isOverdue && <span className="text-terminal-red ml-2">OVERDUE</span>}
                        {isPaid && <span className="text-terminal-green ml-2">PAID</span>}
                      </div>
                    </div>
                    <span className={`text-xs sm:text-2xs font-semibold shrink-0 ${
                      isOverdue ? 'text-terminal-red' : 'text-terminal-amber'
                    }`}>
                      {formatCurrency(ev.amount)}
                    </span>
                  </div>
                );
              }

              // Personal event
              const hex = CALENDAR_COLORS.find((c) => c.value === ev.event.color)?.hex || '#3b82f6';
              const start = new Date(ev.event.startTime);
              const end = new Date(ev.event.endTime);
              return (
                <div
                  key={ev.event.id}
                  className="flex items-center gap-3 px-3 py-2.5 sm:py-2 cursor-pointer row-glow transition-colors"
                  onClick={() => onEventClick(ev)}
                >
                  <span className="w-2 h-2 shrink-0" style={{ backgroundColor: hex }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs sm:text-2xs text-white font-medium truncate">{ev.event.title}</div>
                    <div className="text-2xs text-terminal-muted">
                      {format(start, 'HH:mm')} — {format(end, 'HH:mm')}
                      {ev.event.category && <span className="ml-2">{ev.event.category.toUpperCase()}</span>}
                    </div>
                  </div>
                  {ev.event.tags && ev.event.tags.length > 0 && (
                    <span className="text-2xs text-terminal-muted shrink-0">{ev.event.tags[0]}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
