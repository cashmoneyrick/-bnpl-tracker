import { useMemo } from 'react';
import { parseISO, format, startOfWeek, endOfWeek, addWeeks, isWithinInterval, isSameDay } from 'date-fns';
import { Card } from '../shared/Card';
import { useBNPLStore } from '../../store';
import { formatCurrency } from '../../utils/currency';

interface Insight {
  icon: React.ReactNode;
  text: string;
  type: 'info' | 'warning' | 'success';
}

export function SmartInsights() {
  const payments = useBNPLStore((state) => state.payments);
  const orders = useBNPLStore((state) => state.orders);
  const platforms = useBNPLStore((state) => state.platforms);

  const insights = useMemo(() => {
    const result: Insight[] = [];
    const today = new Date();
    const unpaidPayments = payments.filter((p) => p.status !== 'paid');

    // 1. Payments on same day of week
    const dayOfWeek = today.getDay();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const paymentsOnSameDay = unpaidPayments.filter((p) => {
      const dueDate = parseISO(p.dueDate);
      return dueDate.getDay() === dayOfWeek && dueDate >= today;
    });

    if (paymentsOnSameDay.length > 1) {
      const totalAmount = paymentsOnSameDay.reduce((sum, p) => sum + p.amount, 0);
      result.push({
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        ),
        text: `${paymentsOnSameDay.length} payments (${formatCurrency(totalAmount)}) fall on ${dayNames[dayOfWeek]}s`,
        type: 'info',
      });
    }

    // 2. Busiest upcoming week
    const thisWeekStart = startOfWeek(today);
    const weeks = [0, 1, 2, 3].map((i) => {
      const weekStart = addWeeks(thisWeekStart, i);
      const weekEnd = endOfWeek(weekStart);
      const weekPayments = unpaidPayments.filter((p) => {
        const dueDate = parseISO(p.dueDate);
        return isWithinInterval(dueDate, { start: weekStart, end: weekEnd });
      });
      return {
        weekNum: i,
        start: weekStart,
        end: weekEnd,
        count: weekPayments.length,
        total: weekPayments.reduce((sum, p) => sum + p.amount, 0),
      };
    });

    const busiestWeek = weeks.slice(1).reduce((max, week) =>
      week.count > max.count ? week : max,
      weeks[1]
    );

    if (busiestWeek && busiestWeek.count >= 3) {
      const weekLabel = busiestWeek.weekNum === 1 ? 'Next week' :
        `Week of ${format(busiestWeek.start, 'MMM d')}`;
      result.push({
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        ),
        text: `${weekLabel} is busy: ${busiestWeek.count} payments totaling ${formatCurrency(busiestWeek.total)}`,
        type: 'warning',
      });
    }

    // 3. On-time payment rate
    const paidPayments = payments.filter((p) => p.status === 'paid');
    if (paidPayments.length >= 5) {
      const onTimePayments = paidPayments.filter((p) => p.paidOnTime === true);
      const rate = Math.round((onTimePayments.length / paidPayments.length) * 100);

      if (rate >= 90) {
        result.push({
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          text: `Great job! ${rate}% of your payments are on time`,
          type: 'success',
        });
      } else if (rate < 70) {
        result.push({
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          ),
          text: `Only ${rate}% of payments are on time. Set reminders to improve!`,
          type: 'warning',
        });
      }
    }

    // 4. Most used platform
    if (orders.length >= 3) {
      const platformCounts: Record<string, number> = {};
      orders.forEach((o) => {
        platformCounts[o.platformId] = (platformCounts[o.platformId] || 0) + 1;
      });

      const mostUsed = Object.entries(platformCounts)
        .sort((a, b) => b[1] - a[1])[0];

      if (mostUsed && mostUsed[1] >= 2) {
        const platform = platforms.find((p) => p.id === mostUsed[0]);
        const percentage = Math.round((mostUsed[1] / orders.length) * 100);
        result.push({
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          ),
          text: `${platform?.name} is your most used platform (${percentage}% of orders)`,
          type: 'info',
        });
      }
    }

    // 5. Today's payments
    const todaysPayments = unpaidPayments.filter((p) => isSameDay(parseISO(p.dueDate), today));
    if (todaysPayments.length > 0) {
      const total = todaysPayments.reduce((sum, p) => sum + p.amount, 0);
      result.push({
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        text: `${todaysPayments.length} payment${todaysPayments.length > 1 ? 's' : ''} due today (${formatCurrency(total)})`,
        type: 'warning',
      });
    }

    // 6. Streak tracking - consecutive on-time payments
    const recentPaid = paidPayments
      .filter((p) => p.paidOnTime !== undefined)
      .sort((a, b) => parseISO(b.paidDate!).getTime() - parseISO(a.paidDate!).getTime());

    let streak = 0;
    for (const payment of recentPaid) {
      if (payment.paidOnTime) {
        streak++;
      } else {
        break;
      }
    }

    if (streak >= 5) {
      result.push({
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
          </svg>
        ),
        text: `You're on a ${streak}-payment on-time streak! Keep it up!`,
        type: 'success',
      });
    }

    return result.slice(0, 3); // Limit to 3 insights
  }, [payments, orders, platforms]);

  if (insights.length === 0) {
    return null;
  }

  const typeStyles = {
    info: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    warning: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    success: 'bg-green-500/10 border-green-500/30 text-green-400',
  };

  return (
    <Card padding="md">
      <h2 className="text-lg font-semibold text-white mb-3">Insights</h2>
      <div className="space-y-2">
        {insights.map((insight, index) => (
          <div
            key={index}
            className={`flex items-center gap-3 p-3 rounded-lg border ${typeStyles[insight.type]}`}
          >
            {insight.icon}
            <span className="text-sm">{insight.text}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
