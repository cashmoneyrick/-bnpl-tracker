import {
  usePlatformStats,
  useOrdersByPlatform,
  useMostCommonStore,
} from '../../store/selectors';
import { formatCurrency } from '../../utils/currency';
import type { PlatformId } from '../../types';

interface PlatformStatsPanelProps {
  platformId: PlatformId;
}

export function PlatformStatsPanel({ platformId }: PlatformStatsPanelProps) {
  const stats = usePlatformStats(platformId);
  const orders = useOrdersByPlatform(platformId);
  const mostCommonStore = useMostCommonStore(platformId);

  const activeCount = orders.filter((o) => o.status === 'active').length;
  const completedCount = orders.filter((o) => o.status === 'completed').length;

  const statItems = [
    {
      label: 'Total Orders',
      value: stats.totalOrders.toString(),
    },
    {
      label: 'Active',
      value: activeCount.toString(),
      highlight: activeCount > 0,
    },
    {
      label: 'Completed',
      value: completedCount.toString(),
    },
    {
      label: 'On-Time Rate',
      value: stats.totalPayments > 0 ? `${stats.onTimePaymentRate}%` : 'N/A',
      highlight: stats.onTimePaymentRate >= 90,
    },
    {
      label: 'Avg Order',
      value: stats.totalOrders > 0 ? formatCurrency(stats.averageOrderSize) : 'N/A',
    },
    {
      label: 'Top Store',
      value: mostCommonStore || 'N/A',
      truncate: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {statItems.map((item) => (
        <div
          key={item.label}
          className="p-3 bg-dark-hover rounded-lg"
        >
          <p className="text-xs text-gray-500 mb-1">{item.label}</p>
          <p
            className={`text-sm font-medium ${
              item.highlight ? 'text-green-400' : 'text-white'
            } ${item.truncate ? 'truncate' : ''}`}
            title={item.truncate ? item.value : undefined}
          >
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}
