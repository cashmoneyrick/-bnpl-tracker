import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { addDays, isSameDay, parseISO, format, getDay } from 'date-fns';
import { Card } from '../shared/Card';
import { ProgressRing } from '../shared/ProgressRing';
import { useBNPLStore } from '../../store';
import {
  useTotalOwed,
  useAllPlatformUtilizations,
  useMonthlyPaymentStats,
  useOverallCreditUtilization,
  useUpcomingPayments,
} from '../../store/selectors';
import { formatCurrency } from '../../utils/currency';

// Color coding for payment amounts
function getAmountColor(amount: number): string {
  if (amount === 0) return '';
  if (amount < 2500) return 'bg-green-500/20 text-green-400'; // < $25
  if (amount < 5000) return 'bg-yellow-500/20 text-yellow-400'; // $25-50
  return 'bg-red-500/20 text-red-400'; // > $50
}

export function SummaryCards() {
  const navigate = useNavigate();
  const totalOwed = useTotalOwed();
  const monthlyStats = useMonthlyPaymentStats();
  const creditUtilization = useOverallCreditUtilization();
  const platforms = useBNPLStore((state) => state.platforms);
  const utilizations = useAllPlatformUtilizations();
  const upcomingPayments = useUpcomingPayments(31);

  // Filter platforms with credit limit > 0, sort by leverage (available/used)
  const platformCredits = utilizations
    .filter((u) => u.limit > 0)
    .map((u) => {
      const platform = platforms.find((p) => p.id === u.platformId);
      return platform ? { ...u, platform } : null;
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    .sort((a, b) => {
      // leverageScore = available / (used || 1)
      // Higher score = more available credit relative to debt = better payoff ROI
      const scoreA = a.available / (a.used || 1);
      const scoreB = b.available / (b.used || 1);
      return scoreB - scoreA;
    });

  // Color based on utilization percentage - semantic colors
  const getUtilizationColor = (pct: number) => {
    if (pct >= 80) return '#ef4444'; // red - high usage
    if (pct >= 50) return '#f59e0b'; // amber - medium usage
    return '#22c55e'; // green - low usage
  };

  // Calculate next 21 days (3 weeks) for mini calendar
  const { calendarDays, startDayOfWeek, monthLabel } = useMemo(() => {
    const today = new Date();
    const startDayOfWeek = getDay(today); // 0 = Sunday, 6 = Saturday

    const days = [];
    for (let i = 0; i < 21; i++) {
      const date = addDays(today, i);
      const dayPayments = upcomingPayments.filter((p) =>
        isSameDay(parseISO(p.dueDate), date)
      );
      const total = dayPayments.reduce((sum, p) => sum + p.amount, 0);

      days.push({
        day: date.getDate(),
        date,
        payments: dayPayments,
        total,
        isToday: i === 0,
      });
    }

    // Get month label (e.g., "January 2026" or "Jan - Feb 2026" if spanning months)
    const lastDate = addDays(today, 20);
    const sameMonth = today.getMonth() === lastDate.getMonth();
    const monthLabel = sameMonth
      ? format(today, 'MMMM yyyy')
      : `${format(today, 'MMM')} - ${format(lastDate, 'MMM yyyy')}`;

    return { calendarDays: days, startDayOfWeek, monthLabel };
  }, [upcomingPayments]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Credit Leverage Card - Merged Total Owed + Available Credit */}
      <Card>
        {/* Total Owed Section */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <p className="text-sm text-gray-400">Credit Leverage</p>
            <p className="text-2xl font-bold text-white mt-1">
              {formatCurrency(totalOwed)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {creditUtilization.limit > 0
                ? `of ${formatCurrency(creditUtilization.limit)} limit`
                : 'No credit limits set'}
            </p>
          </div>
          {creditUtilization.limit > 0 && (
            <ProgressRing
              percentage={creditUtilization.percentage}
              size="lg"
              color={getUtilizationColor(creditUtilization.percentage)}
            />
          )}
        </div>

        {/* Platform Breakdown */}
        {platformCredits.length > 0 && (
          <div className="border-t border-dark-border pt-3">
            <p className="text-xs text-gray-500 mb-2">By Platform</p>

            {/* Column Headers */}
            <div className="grid grid-cols-[1fr_5rem_4rem_4rem_3rem] gap-2 items-center text-[10px] mb-2">
              <span></span>
              <span className="text-center text-green-400">Left to Spend</span>
              <span className="text-center text-red-400">Spent</span>
              <span className="text-center text-gray-400">Limit</span>
              <span className="text-center text-gray-400">Usage</span>
            </div>

            {/* Platform Rows */}
            <div className="space-y-3">
              {platformCredits.map(({ platform, used, available, limit, percentage }) => (
                <div key={platform.id}>
                  <div className="grid grid-cols-[1fr_5rem_4rem_4rem_3rem] gap-2 items-center mb-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: platform.color }}
                      />
                      <span className="text-sm text-white">{platform.name}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs text-center">
                      {formatCurrency(available)}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs text-center">
                      {formatCurrency(used)}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-gray-500/20 text-gray-400 text-xs text-center">
                      {formatCurrency(limit)}
                    </span>
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-medium text-center"
                      style={{
                        backgroundColor: `${getUtilizationColor(percentage)}20`,
                        color: getUtilizationColor(percentage),
                      }}
                    >
                      {Math.round(percentage)}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-dark-bg rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(percentage, 100)}%`,
                        backgroundColor: getUtilizationColor(percentage),
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => navigate('/settings')}
              className="w-full mt-4 pt-3 text-xs text-blue-400 hover:text-blue-300 transition-colors border-t border-dark-border"
            >
              Manage Credit Limits
            </button>
          </div>
        )}
      </Card>

      {/* This Month Card with Mini Calendar */}
      <Card className="cursor-pointer hover:bg-dark-hover/50 transition-colors">
        {/* Stats Section */}
        <div
          className="flex items-center justify-between"
          onClick={() => navigate('/calendar')}
        >
          <div className="flex-1">
            <p className="text-sm text-gray-400">This Month</p>
            <p className="text-2xl font-bold text-white mt-1">
              {formatCurrency(monthlyStats.pending)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {monthlyStats.paid > 0
                ? `${formatCurrency(monthlyStats.paid)} paid`
                : 'remaining to pay'}
            </p>
          </div>
          {monthlyStats.total > 0 ? (
            <ProgressRing
              percentage={monthlyStats.percentage}
              size="lg"
              color="#22c55e"
            />
          ) : (
            <div className="p-2 bg-green-500/10 rounded-lg">
              <svg
                className="w-6 h-6 text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Mini Calendar */}
        {calendarDays.length > 0 && (
          <div className="mt-4 pt-4 border-t border-dark-border">
            {/* Month Header */}
            <p className="text-xs text-gray-400 text-center mb-2 font-medium">{monthLabel}</p>

            {/* Day of Week Headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                <div key={i} className="text-center text-[10px] text-gray-500 font-medium">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells for alignment */}
              {Array.from({ length: startDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[36px]" />
              ))}

              {/* Day cells */}
              {calendarDays.map((dayData, index) => (
                <button
                  key={index}
                  onClick={() => navigate('/calendar')}
                  className={`
                    p-1.5 rounded text-center text-xs min-h-[36px] flex flex-col items-center justify-center
                    ${dayData.isToday ? 'ring-1 ring-blue-500' : ''}
                    ${dayData.payments.length > 0 ? getAmountColor(dayData.total) : 'text-gray-600'}
                    cursor-pointer hover:opacity-80
                  `}
                >
                  <div className="font-medium">{dayData.day}</div>
                  {dayData.total > 0 && (
                    <div className="text-[9px] mt-0.5 truncate w-full">
                      ${Math.round(dayData.total / 100)}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
