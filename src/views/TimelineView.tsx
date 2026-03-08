import { parseISO, format, differenceInDays, startOfMonth, endOfMonth, addDays } from 'date-fns';
import { useTimelineData } from '../store/selectors';
import { formatCurrency } from '../utils/currency';

export function TimelineView() {
  const timelineData = useTimelineData();

  if (!timelineData || timelineData.rows.length === 0) {
    return (
      <div className="hud-section">
        <div className="hud-section-inner relative">
          <div className="flex items-center justify-between px-3 py-2 border-b border-dark-border">
            <span className="terminal-label">TIMELINE</span>
            <span className="text-2xs text-terminal-muted">GANTT</span>
          </div>
          <div className="text-center py-16">
            <p className="text-terminal-amber text-xs font-medium">NO ACTIVE ORDERS</p>
            <p className="text-terminal-muted text-2xs mt-1">Add orders to see their timeline</p>
          </div>
        </div>
      </div>
    );
  }

  const { rows, rangeStart, totalDays, todayOffset } = timelineData;

  const getOffsetPct = (dateStr: string) => {
    const d = parseISO(dateStr);
    return (differenceInDays(d, rangeStart) / totalDays) * 100;
  };

  // Generate month markers
  const months: { label: string; offsetPct: number }[] = [];
  let d = startOfMonth(rangeStart);
  const rangeEndDate = addDays(rangeStart, totalDays);
  while (d.getTime() <= rangeEndDate.getTime()) {
    const offset = differenceInDays(d, rangeStart);
    if (offset >= 0) {
      months.push({
        label: format(d, 'MMM yyyy').toUpperCase(),
        offsetPct: (offset / totalDays) * 100,
      });
    }
    d = startOfMonth(addDays(endOfMonth(d), 1));
  }

  return (
    <div className="hud-section">
      <div className="hud-section-inner relative">
        <div className="flex items-center justify-between px-3 py-2 border-b border-dark-border">
          <span className="terminal-label">TIMELINE</span>
          <span className="text-2xs text-terminal-muted">ORDER GANTT</span>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            {/* Month headers */}
            <div className="relative h-6 border-b border-dark-border bg-dark-bg/50">
              {months.map((m) => (
                <div
                  key={m.label + m.offsetPct}
                  className="absolute top-0 text-2xs text-terminal-muted font-medium px-1 leading-6 border-l border-dark-border/50"
                  style={{ left: `${Math.max(m.offsetPct, 0)}%` }}
                >
                  {m.label}
                </div>
              ))}
              {/* Today marker label */}
              {todayOffset >= 0 && todayOffset <= 100 && (
                <div
                  className="absolute top-0 text-2xs text-terminal-amber font-bold leading-6 z-10"
                  style={{ left: `${todayOffset}%`, transform: 'translateX(-50%)' }}
                >
                  TODAY
                </div>
              )}
            </div>

            {/* Gantt rows */}
            {rows.map((row) => {
              const firstPmt = row.payments[0];
              const lastPmt = row.payments[row.payments.length - 1];
              const barStart = getOffsetPct(firstPmt.dueDate);
              const barEnd = getOffsetPct(lastPmt.dueDate);
              const barWidth = Math.max(barEnd - barStart, 0.5);

              return (
                <div
                  key={row.orderId}
                  className="relative flex items-center border-b border-dark-border/50 h-10 hover:bg-dark-hover/30 transition-colors"
                >
                  {/* Today line */}
                  {todayOffset >= 0 && todayOffset <= 100 && (
                    <div
                      className="absolute top-0 bottom-0 w-px bg-terminal-amber/40 z-10"
                      style={{ left: `${todayOffset}%` }}
                    />
                  )}

                  {/* Label overlay */}
                  <div className="absolute left-1 top-1/2 -translate-y-1/2 flex items-center gap-1 z-20 bg-dark-card/90 px-1">
                    <span className="w-2 h-2 shrink-0" style={{ backgroundColor: row.platformColor }} />
                    <span className="text-2xs text-white truncate max-w-[80px]">{row.storeName}</span>
                    <span className="text-2xs text-terminal-muted hidden sm:inline">{formatCurrency(row.totalAmount)}</span>
                  </div>

                  {/* Bar background */}
                  <div
                    className="absolute h-3 top-1/2 -translate-y-1/2 opacity-25"
                    style={{
                      left: `${barStart}%`,
                      width: `${barWidth}%`,
                      backgroundColor: row.platformColor,
                    }}
                  />

                  {/* Payment dots */}
                  {row.payments.map((p) => {
                    const left = getOffsetPct(p.dueDate);
                    const dotColor =
                      p.status === 'paid'
                        ? 'bg-terminal-green'
                        : p.status === 'overdue'
                          ? 'bg-terminal-red'
                          : 'bg-terminal-amber';
                    return (
                      <div
                        key={p.id}
                        className={`absolute w-2.5 h-2.5 ${dotColor} top-1/2 -translate-y-1/2 -translate-x-1/2 z-10`}
                        style={{ left: `${left}%` }}
                        title={`${format(parseISO(p.dueDate), 'MMM dd')} — ${formatCurrency(p.amount)} (${p.status})`}
                      />
                    );
                  })}
                </div>
              );
            })}

            {/* Legend */}
            <div className="flex items-center gap-4 px-3 py-2 text-2xs border-t border-dark-border">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 bg-terminal-green" />
                <span className="text-terminal-muted">PAID</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 bg-terminal-amber" />
                <span className="text-terminal-muted">PENDING</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 bg-terminal-red" />
                <span className="text-terminal-muted">OVERDUE</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-px h-3 bg-terminal-amber/40 inline-block" />
                <span className="text-terminal-muted">TODAY</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
