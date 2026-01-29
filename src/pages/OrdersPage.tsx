import { useState, useEffect } from 'react';
import { ViewToggle } from '../components/orders/ViewToggle';
import { GridView } from '../components/orders/GridView';
import { PlatformDashboardView } from '../components/orders/PlatformDashboardView';

type ViewMode = 'grid' | 'platform';

const STORAGE_KEY = 'ordersViewMode';

export function OrdersPage() {
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return (stored === 'grid' || stored === 'platform') ? stored : 'grid';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, viewMode);
  }, [viewMode]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Orders</h1>
        <ViewToggle value={viewMode} onChange={setViewMode} />
      </div>

      {/* Content */}
      {viewMode === 'grid' ? <GridView /> : <PlatformDashboardView />}
    </div>
  );
}
