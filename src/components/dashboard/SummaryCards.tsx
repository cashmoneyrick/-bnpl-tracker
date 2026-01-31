import { useNavigate } from 'react-router-dom';
import { Card } from '../shared/Card';
import { ProgressRing } from '../shared/ProgressRing';
import { MiniCalendar } from './MiniCalendar';
import { useBNPLStore } from '../../store';
import {
  useTotalOwed,
  useAllPlatformUtilizations,
  useOverallCreditUtilization,
} from '../../store/selectors';
import { formatCurrency } from '../../utils/currency';

export function SummaryCards() {
  const navigate = useNavigate();
  const totalOwed = useTotalOwed();
  const creditUtilization = useOverallCreditUtilization();
  const platforms = useBNPLStore((state) => state.platforms);
  const utilizations = useAllPlatformUtilizations();

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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
      {/* Credit Leverage Card */}
      <Card>
        <p className="text-sm text-gray-400 mb-4">Credit Leverage</p>

        {creditUtilization.limit > 0 ? (
          <>
            {/* Main Display - Ring with Stats on sides */}
            <div className="flex items-center justify-between gap-4 mb-5">
              {/* Left Side - Available */}
              <div className="flex-1 text-center">
                <p className="text-xs text-gray-500 mb-1">Available</p>
                <p className="text-xl font-bold text-emerald-400">
                  {formatCurrency(creditUtilization.limit - totalOwed)}
                </p>
                <p className="text-[10px] text-emerald-400/60 mt-0.5">left to spend</p>
              </div>

              {/* Center - Ring */}
              <div className="relative">
                <ProgressRing
                  percentage={creditUtilization.percentage}
                  size="lg"
                  color={getUtilizationColor(creditUtilization.percentage)}
                />
              </div>

              {/* Right Side - Used */}
              <div className="flex-1 text-center">
                <p className="text-xs text-gray-500 mb-1">Used</p>
                <p
                  className="text-xl font-bold"
                  style={{ color: getUtilizationColor(creditUtilization.percentage) }}
                >
                  {formatCurrency(totalOwed)}
                </p>
                <p
                  className="text-[10px] mt-0.5"
                  style={{ color: `${getUtilizationColor(creditUtilization.percentage)}99` }}
                >
                  spent
                </p>
              </div>
            </div>

            {/* Limit Bar */}
            <div className="relative mb-4">
              {/* Background track */}
              <div className="h-2 bg-dark-bg rounded-full overflow-hidden">
                {/* Used portion */}
                <div
                  className="h-full rounded-full transition-all duration-500 relative"
                  style={{
                    width: `${Math.min(creditUtilization.percentage, 100)}%`,
                    backgroundColor: getUtilizationColor(creditUtilization.percentage),
                  }}
                />
              </div>
              {/* Labels below bar */}
              <div className="flex justify-between mt-1.5">
                <span className="text-[10px] text-gray-500">$0</span>
                <span className="text-[10px] text-gray-400 font-medium">
                  {formatCurrency(creditUtilization.limit)} limit
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-6">
            <p className="text-gray-500 text-sm">No credit limits set</p>
            <button
              onClick={() => navigate('/settings')}
              className="mt-2 text-xs text-blue-400 hover:text-blue-300"
            >
              Set up limits
            </button>
          </div>
        )}

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

      {/* Calendar */}
      <MiniCalendar />
    </div>
  );
}
