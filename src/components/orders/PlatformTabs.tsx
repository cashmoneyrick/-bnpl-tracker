import { PlatformIcon } from '../shared/PlatformIcon';
import { useBNPLStore } from '../../store';
import { useAllPlatformUtilizations } from '../../store/selectors';
import type { PlatformId } from '../../types';

interface PlatformTabsProps {
  selectedId: PlatformId | null;
  onSelect: (id: PlatformId) => void;
}

export function PlatformTabs({ selectedId, onSelect }: PlatformTabsProps) {
  const platforms = useBNPLStore((state) => state.platforms);
  const orders = useBNPLStore((state) => state.orders);
  const utilizations = useAllPlatformUtilizations();

  // Count orders per platform
  const orderCounts: Record<string, number> = {};
  for (const order of orders) {
    orderCounts[order.platformId] = (orderCounts[order.platformId] || 0) + 1;
  }

  // Sort platforms by order count (descending - most orders first)
  const sortedPlatforms = [...platforms].sort(
    (a, b) => (orderCounts[b.id] || 0) - (orderCounts[a.id] || 0)
  );

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 -mb-2 scrollbar-hide">
      {sortedPlatforms.map((platform) => {
        const isSelected = selectedId === platform.id;
        const count = orderCounts[platform.id] || 0;
        const utilization = utilizations.find((u) => u.platformId === platform.id);
        const isNearLimit = utilization && utilization.percentage > 80;

        return (
          <button
            key={platform.id}
            onClick={() => onSelect(platform.id)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg border transition-all whitespace-nowrap
              ${
                isSelected
                  ? 'border-current bg-dark-hover'
                  : 'border-dark-border hover:border-gray-600 bg-dark-card'
              }
            `}
            style={{
              color: isSelected ? platform.color : '#9ca3af',
              borderColor: isSelected ? platform.color : undefined,
            }}
          >
            <PlatformIcon
              platformId={platform.id}
              size="sm"
              style={{ color: isSelected ? platform.color : '#9ca3af' }}
            />
            <span className="font-medium">{platform.name}</span>
            <span className={`text-xs ${isSelected ? 'opacity-70' : 'text-gray-500'}`}>
              {count}
            </span>
            {isNearLimit && (
              <span className="w-2 h-2 rounded-full bg-amber-500" title="Near credit limit" />
            )}
          </button>
        );
      })}
    </div>
  );
}
