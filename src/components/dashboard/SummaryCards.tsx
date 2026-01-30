import { useState, useEffect, useMemo } from 'react';
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

  // Credit modal state
  const [showCreditModal, setShowCreditModal] = useState(false);

  // Close modal on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setShowCreditModal(false);
      }
    }
    if (showCreditModal) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [showCreditModal]);

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

  const totalAvailable = platformCredits.reduce((sum, p) => sum + p.available, 0);
  const totalLimit = platformCredits.reduce((sum, p) => sum + p.limit, 0);
  const totalUsed = platformCredits.reduce((sum, p) => sum + p.used, 0);
  const overallPercentage = totalLimit > 0 ? (totalUsed / totalLimit) * 100 : 0;

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
      <Card
        className="cursor-pointer hover:bg-dark-hover/50 transition-colors"
        onClick={() => platformCredits.length > 0 && setShowCreditModal(true)}
      >
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
          <>
            <div className="border-t border-dark-border pt-3">
              <p className="text-xs text-gray-500 mb-2">By Platform</p>
              <div className="space-y-2">
                {platformCredits.slice(0, 3).map(({ platform, used, limit, percentage }) => (
                  <div key={platform.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: platform.color }}
                      />
                      <span className="text-sm text-white">{platform.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">
                        {formatCurrency(used)} / {formatCurrency(limit)}
                      </span>
                      <span
                        className="text-xs font-medium w-8 text-right"
                        style={{ color: getUtilizationColor(percentage) }}
                      >
                        {Math.round(percentage)}%
                      </span>
                    </div>
                  </div>
                ))}
                {platformCredits.length > 3 && (
                  <p className="text-xs text-gray-500 text-center">
                    +{platformCredits.length - 3} more
                  </p>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3 text-center">Click for details</p>
          </>
        )}
      </Card>

      {/* Credit Details Modal */}
      {showCreditModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowCreditModal(false)}
        >
          <div
            className="bg-dark-card border border-dark-border rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-dark-border">
              <h2 className="text-lg font-semibold text-white">Credit Overview</h2>
              <button
                onClick={() => setShowCreditModal(false)}
                className="p-1 text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-dark-hover/30 border-b border-dark-border">
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-1">Total Limit</p>
                <p className="text-lg font-bold text-white">{formatCurrency(totalLimit)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-1">Used</p>
                <p className="text-lg font-bold text-white">{formatCurrency(totalUsed)}</p>
                <p className="text-xs text-gray-400">{Math.round(overallPercentage)}%</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-1">Available</p>
                <p className="text-lg font-bold text-green-400">{formatCurrency(totalAvailable)}</p>
                <p className="text-xs text-gray-400">{Math.round(100 - overallPercentage)}%</p>
              </div>
            </div>

            {/* Platform Details */}
            <div className="p-4 overflow-y-auto max-h-[50vh]">
              <h3 className="text-sm font-medium text-gray-400 mb-3">By Platform</h3>
              <div className="space-y-4">
                {platformCredits.map(({ platform, used, available, limit, percentage }) => (
                  <div key={platform.id} className="bg-dark-hover/30 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: platform.color }}
                        />
                        <span className="font-medium text-white">{platform.name}</span>
                      </div>
                      <span className="text-sm text-gray-400">
                        Limit: {formatCurrency(limit)}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex-1 h-2 bg-dark-bg rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(percentage, 100)}%`,
                            backgroundColor: getUtilizationColor(percentage),
                          }}
                        />
                      </div>
                      <span
                        className="text-sm font-medium w-12 text-right"
                        style={{ color: getUtilizationColor(percentage) }}
                      >
                        {Math.round(percentage)}%
                      </span>
                    </div>

                    {/* Used / Available Row */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex justify-between items-center bg-dark-bg/50 rounded px-2 py-1.5">
                        <span className="text-gray-500">Used</span>
                        <div className="text-right">
                          <span className="text-white font-medium">{formatCurrency(used)}</span>
                          <span className="text-gray-500 ml-1">({Math.round(percentage)}%)</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center bg-dark-bg/50 rounded px-2 py-1.5">
                        <span className="text-gray-500">Left</span>
                        <div className="text-right">
                          <span className="text-green-400 font-medium">{formatCurrency(available)}</span>
                          <span className="text-gray-500 ml-1">({Math.round(100 - percentage)}%)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-dark-border">
              <button
                onClick={() => {
                  setShowCreditModal(false);
                  navigate('/settings');
                }}
                className="w-full py-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                Manage Credit Limits
              </button>
            </div>
          </div>
        </div>
      )}

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
