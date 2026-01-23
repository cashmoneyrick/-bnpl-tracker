import { Card } from '../shared/Card';
import { ProgressBar } from '../shared/ProgressBar';
import { useBNPLStore } from '../../store';
import { useAllPlatformUtilizations } from '../../store/selectors';
import { formatCurrency } from '../../utils/currency';

export function PlatformUtilization() {
  const platforms = useBNPLStore((state) => state.platforms);
  const utilizations = useAllPlatformUtilizations();

  return (
    <Card>
      <h2 className="text-lg font-semibold text-white mb-4">
        Platform Utilization
      </h2>
      <div className="space-y-4">
        {platforms.map((platform) => {
          const utilization = utilizations.find(
            (u) => u.platformId === platform.id
          );
          if (!utilization) return null;

          // Skip platforms with 0 limit (like Affirm)
          const hasLimit = platform.creditLimit > 0;

          return (
            <div key={platform.id}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: platform.color }}
                  />
                  <span className="text-sm font-medium text-white">
                    {platform.name}
                  </span>
                </div>
                <span className="text-sm text-gray-400">
                  {formatCurrency(utilization.used)}
                  {hasLimit && (
                    <span className="text-gray-500">
                      {' '}
                      / {formatCurrency(utilization.limit)}
                    </span>
                  )}
                </span>
              </div>
              {hasLimit ? (
                <ProgressBar
                  value={utilization.percentage}
                  color={platform.color}
                  size="md"
                />
              ) : (
                <div className="h-2.5 bg-dark-border rounded-full">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: utilization.used > 0 ? '100%' : '0%',
                      backgroundColor: platform.color,
                      opacity: 0.5,
                    }}
                  />
                </div>
              )}
              {hasLimit && utilization.percentage >= 80 && (
                <p className="text-xs text-amber-400 mt-1">
                  {utilization.percentage >= 100
                    ? 'At limit'
                    : `${Math.round(utilization.percentage)}% used`}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
