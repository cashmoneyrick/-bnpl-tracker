import { useState, useMemo } from 'react';
import { parseISO, format, startOfWeek, endOfWeek, addWeeks, isWithinInterval, isSameDay } from 'date-fns';
import { useBNPLStore } from '../../store';
import { formatCurrency } from '../../utils/currency';

interface Insight {
  text: string;
  type: 'info' | 'warning' | 'success';
}

const DISMISSED_KEY = 'dashboard-insight-dismissed';

export function InsightStrip() {
  const payments = useBNPLStore((state) => state.payments);
  const orders = useBNPLStore((state) => state.orders);
  const platforms = useBNPLStore((state) => state.platforms);

  const [dismissed, setDismissed] = useState(() => {
    const stored = localStorage.getItem(DISMISSED_KEY);
    if (!stored) return null;
    const { date } = JSON.parse(stored);
    // Reset dismissal after 24 hours
    if (Date.now() - date > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(DISMISSED_KEY);
      return null;
    }
    return stored;
  });

  const insight = useMemo((): Insight | null => {
    const today = new Date();
    const unpaidPayments = payments.filter((p) => p.status !== 'paid');
    const paidPayments = payments.filter((p) => p.status === 'paid');

    // Priority 1: Today's payments (most urgent)
    const todaysPayments = unpaidPayments.filter((p) => isSameDay(parseISO(p.dueDate), today));
    if (todaysPayments.length > 0) {
      const total = todaysPayments.reduce((sum, p) => sum + p.amount, 0);
      return {
        text: `${todaysPayments.length} payment${todaysPayments.length > 1 ? 's' : ''} due today (${formatCurrency(total)})`,
        type: 'warning',
      };
    }

    // Priority 2: Busiest upcoming week
    const thisWeekStart = startOfWeek(today);
    const weeks = [1, 2, 3].map((i) => {
      const weekStart = addWeeks(thisWeekStart, i);
      const weekEnd = endOfWeek(weekStart);
      const weekPayments = unpaidPayments.filter((p) => {
        const dueDate = parseISO(p.dueDate);
        return isWithinInterval(dueDate, { start: weekStart, end: weekEnd });
      });
      return {
        weekNum: i,
        start: weekStart,
        count: weekPayments.length,
        total: weekPayments.reduce((sum, p) => sum + p.amount, 0),
      };
    });

    const busiestWeek = weeks.reduce((max, week) => week.count > max.count ? week : max, weeks[0]);
    if (busiestWeek && busiestWeek.count >= 3) {
      const weekLabel = busiestWeek.weekNum === 1 ? 'Next week' : `Week of ${format(busiestWeek.start, 'MMM d')}`;
      return {
        text: `${weekLabel} is busy: ${busiestWeek.count} payments (${formatCurrency(busiestWeek.total)})`,
        type: 'warning',
      };
    }

    // Priority 3: On-time streak
    if (paidPayments.length >= 5) {
      const recentPaid = paidPayments
        .filter((p) => p.paidOnTime !== undefined)
        .sort((a, b) => parseISO(b.paidDate!).getTime() - parseISO(a.paidDate!).getTime());

      let streak = 0;
      for (const payment of recentPaid) {
        if (payment.paidOnTime) streak++;
        else break;
      }

      if (streak >= 5) {
        return {
          text: `You're on a ${streak}-payment on-time streak!`,
          type: 'success',
        };
      }

      // On-time rate feedback
      const onTimePayments = paidPayments.filter((p) => p.paidOnTime === true);
      const rate = Math.round((onTimePayments.length / paidPayments.length) * 100);
      if (rate >= 90) {
        return {
          text: `${rate}% of your payments are on time`,
          type: 'success',
        };
      }
    }

    // Priority 4: Most used platform
    if (orders.length >= 3) {
      const platformCounts: Record<string, number> = {};
      orders.forEach((o) => {
        platformCounts[o.platformId] = (platformCounts[o.platformId] || 0) + 1;
      });

      const mostUsed = Object.entries(platformCounts).sort((a, b) => b[1] - a[1])[0];
      if (mostUsed && mostUsed[1] >= 2) {
        const platform = platforms.find((p) => p.id === mostUsed[0]);
        const percentage = Math.round((mostUsed[1] / orders.length) * 100);
        return {
          text: `${platform?.name} is your most used platform (${percentage}% of orders)`,
          type: 'info',
        };
      }
    }

    return null;
  }, [payments, orders, platforms]);

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify({ date: Date.now() }));
    setDismissed('true');
  };

  if (!insight || dismissed) {
    return null;
  }

  const typeStyles = {
    info: 'text-gray-400',
    warning: 'text-amber-400/80',
    success: 'text-green-400/80',
  };

  return (
    <div className="flex items-center justify-between px-4 py-2.5 bg-dark-card/50 rounded-lg border border-dark-border/50">
      <div className={`flex items-center gap-2.5 text-sm ${typeStyles[insight.type]}`}>
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
        <span>{insight.text}</span>
      </div>
      <button
        onClick={handleDismiss}
        className="p-1 text-gray-500 hover:text-gray-300 transition-colors"
        title="Dismiss for today"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
