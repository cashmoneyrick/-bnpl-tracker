import { useState, useEffect } from 'react';
import { PlatformTabs } from './PlatformTabs';
import { PlatformCreditBar } from './PlatformCreditBar';
import { PlatformStatsPanel } from './PlatformStatsPanel';
import { PlatformOrdersList } from './PlatformOrdersList';
import { PlatformPaymentSchedule } from './PlatformPaymentSchedule';
import { CollapsibleSection } from '../shared/CollapsibleSection';
import { PlatformIcon } from '../shared/PlatformIcon';
import { useBNPLStore } from '../../store';
import { useOrdersByPlatform, usePlatform } from '../../store/selectors';
import type { PlatformId } from '../../types';

export function PlatformDashboardView() {
  const platforms = useBNPLStore((state) => state.platforms);
  const [selectedPlatformId, setSelectedPlatformId] = useState<PlatformId | null>(null);

  // Auto-select first platform on mount
  useEffect(() => {
    if (!selectedPlatformId && platforms.length > 0) {
      setSelectedPlatformId(platforms[0].id);
    }
  }, [platforms, selectedPlatformId]);

  if (!selectedPlatformId) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Loading platforms...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Platform Tabs */}
      <PlatformTabs
        selectedId={selectedPlatformId}
        onSelect={setSelectedPlatformId}
      />

      {/* Selected Platform Content */}
      <PlatformContent platformId={selectedPlatformId} />
    </div>
  );
}

interface PlatformContentProps {
  platformId: PlatformId;
}

function PlatformContent({ platformId }: PlatformContentProps) {
  const platform = usePlatform(platformId);
  const orders = useOrdersByPlatform(platformId);

  const activeOrders = orders.filter((o) => o.status === 'active');
  const completedOrders = orders.filter((o) => o.status === 'completed');

  if (!platform) return null;

  return (
    <div className="space-y-6">
      {/* Platform Header */}
      <div className="flex items-center gap-3">
        <div
          className="p-2 rounded-lg"
          style={{ backgroundColor: `${platform.color}20` }}
        >
          <PlatformIcon
            platformId={platformId}
            size="md"
            style={{ color: platform.color }}
          />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white">{platform.name}</h2>
          <p className="text-sm text-gray-400">
            {orders.length} order{orders.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Credit and Stats Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PlatformCreditBar platformId={platformId} />
        <PlatformStatsPanel platformId={platformId} />
      </div>

      {/* Active Orders */}
      <div>
        <h3 className="text-sm font-medium text-gray-300 mb-3">
          Active Orders ({activeOrders.length})
        </h3>
        <PlatformOrdersList
          orders={activeOrders}
          emptyMessage="No active orders"
        />
      </div>

      {/* Completed Orders (Collapsible) */}
      {completedOrders.length > 0 && (
        <CollapsibleSection
          title="Completed Orders"
          count={completedOrders.length}
          defaultExpanded={false}
        >
          <PlatformOrdersList orders={completedOrders} />
        </CollapsibleSection>
      )}

      {/* Payment Schedule */}
      <div>
        <h3 className="text-sm font-medium text-gray-300 mb-3">
          Payment Schedule
        </h3>
        <PlatformPaymentSchedule platformId={platformId} limit={5} />
      </div>
    </div>
  );
}
