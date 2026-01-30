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

      {/* Calendar */}
      <MiniCalendar />
    </div>
  );
}
