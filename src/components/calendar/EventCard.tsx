import { formatCurrency } from '../../utils/currency';
import { CALENDAR_COLORS } from '../../types/calendar';
import type { UnifiedCalendarEvent } from '../../types/calendar';

interface EventCardProps {
  event: UnifiedCalendarEvent;
  onClick: () => void;
  compact?: boolean;
  draggable?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

function getPersonalColor(color: string): string {
  return CALENDAR_COLORS.find((c) => c.value === color)?.hex || '#3b82f6';
}

export function EventCard({ event, onClick, compact, draggable, onDragStart, onDragEnd }: EventCardProps) {
  if (event.type === 'payment') {
    const isPaid = event.status === 'paid';
    const isOverdue = event.status === 'overdue';

    return (
      <div
        className={`cursor-pointer px-1.5 py-0.5 text-2xs truncate transition-colors hover:opacity-80 ${
          isPaid ? 'opacity-40 line-through' : ''
        } ${isOverdue ? 'ring-1 ring-terminal-red' : ''}`}
        style={{ backgroundColor: event.platformColor + '20', borderLeft: `2px solid ${event.platformColor}` }}
        onClick={onClick}
        title={`${event.storeName} — ${formatCurrency(event.amount)} (${event.installmentNumber}/${event.totalInstallments})`}
      >
        {compact ? (
          <span style={{ color: event.platformColor }}>{formatCurrency(event.amount)}</span>
        ) : (
          <span className="flex items-center gap-1">
            <span style={{ color: event.platformColor }} className="font-medium">{formatCurrency(event.amount)}</span>
            <span className="text-terminal-muted">{event.storeName}</span>
          </span>
        )}
      </div>
    );
  }

  // Personal event
  const hex = getPersonalColor(event.event.color);
  return (
    <div
      className="cursor-pointer px-1.5 py-0.5 text-2xs truncate transition-colors hover:opacity-80"
      style={{ backgroundColor: hex + '20', borderLeft: `2px solid ${hex}` }}
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      title={event.event.title}
    >
      <span style={{ color: hex }} className="font-medium">{event.event.title}</span>
    </div>
  );
}
