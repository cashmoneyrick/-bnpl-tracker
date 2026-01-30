import { Card } from '../shared/Card';
import { PlatformDashboardView } from '../orders/PlatformDashboardView';

export function OrdersSection() {
  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Orders</h2>
      </div>
      <PlatformDashboardView />
    </Card>
  );
}
