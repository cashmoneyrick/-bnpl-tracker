import { usePlatformUtilization, usePlatform } from '../../store/selectors';
import { formatCurrency } from '../../utils/currency';
import type { PlatformId } from '../../types';

interface PlatformCreditBarProps {
  platformId: PlatformId;
}

export function PlatformCreditBar({ platformId }: PlatformCreditBarProps) {
  const platform = usePlatform(platformId);
  const utilization = usePlatformUtilization(platformId);

  if (!platform || utilization.limit === 0) {
    return (
      <div className="p-4 bg-dark-hover rounded-lg">
        <p className="text-sm text-gray-400">No credit limit set</p>
        <p className="text-xs text-gray-500 mt-1">
          Set a credit limit in Settings to track utilization
        </p>
      </div>
    );
  }

  const barColor =
    utilization.percentage > 80
      ? 'bg-red-500'
      : utilization.percentage > 50
      ? 'bg-amber-500'
      : 'bg-green-500';

  return (
    <div className="p-4 bg-dark-hover rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-400">Credit Usage</span>
        <span className="text-sm font-medium text-white">
          {formatCurrency(utilization.used)} / {formatCurrency(utilization.limit)}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-dark-card rounded-full overflow-hidden mb-2">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.min(utilization.percentage, 100)}%` }}
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">
          {utilization.percentage.toFixed(0)}% used
        </span>
        <span className="text-sm font-medium" style={{ color: platform.color }}>
          {formatCurrency(utilization.available)} available
        </span>
      </div>
    </div>
  );
}
