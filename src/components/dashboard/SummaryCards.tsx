import { Card } from '../shared/Card';
import { useBNPLStore } from '../../store';
import {
  useTotalOwed,
  useAllPlatformUtilizations,
  useMonthlyOutgoing,
} from '../../store/selectors';
import { formatCurrency } from '../../utils/currency';

export function SummaryCards() {
  const totalOwed = useTotalOwed();
  const monthlyOutgoing = useMonthlyOutgoing();
  const platforms = useBNPLStore((state) => state.platforms);
  const utilizations = useAllPlatformUtilizations();

  // Filter platforms with credit limit > 0, sort by available (descending)
  const platformCredits = utilizations
    .filter((u) => u.limit > 0)
    .map((u) => {
      const platform = platforms.find((p) => p.id === u.platformId);
      return platform ? { ...u, platform } : null;
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    .sort((a, b) => b.available - a.available);

  const totalAvailable = platformCredits.reduce((sum, p) => sum + p.available, 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Total Owed */}
      <Card>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-400">Total Owed</p>
            <p className="text-2xl font-bold text-white mt-1">
              {formatCurrency(totalOwed)}
            </p>
          </div>
          <div className="p-2 bg-red-500/10 rounded-lg">
            <svg
              className="w-6 h-6 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>
      </Card>

      {/* Available Credit - Per Platform */}
      <Card>
        <p className="text-sm text-gray-400 mb-3">Available Credit</p>
        <div className="space-y-2">
          {platformCredits.map(({ platform, available }) => (
            <div key={platform.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: platform.color }}
                />
                <span className="text-sm text-gray-300">{platform.name}</span>
              </div>
              <span className="text-sm font-medium text-white">
                {formatCurrency(available)}
              </span>
            </div>
          ))}
        </div>
        {platformCredits.length > 0 && (
          <div className="mt-3 pt-3 border-t border-dark-border">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Total</span>
              <span className="text-xs text-gray-500">
                {formatCurrency(totalAvailable)}
              </span>
            </div>
          </div>
        )}
      </Card>

      {/* This Month's Outgoing */}
      <Card>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-400">This Month</p>
            <p className="text-2xl font-bold text-white mt-1">
              {formatCurrency(monthlyOutgoing)}
            </p>
          </div>
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <svg
              className="w-6 h-6 text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        </div>
      </Card>
    </div>
  );
}
