import { useUpcomingPaymentsByPlatform } from '../../store/selectors';
import { useBNPLStore } from '../../store';
import { formatCurrency } from '../../utils/currency';
import { format, parseISO } from 'date-fns';
import type { PlatformId } from '../../types';

interface PlatformPaymentScheduleProps {
  platformId: PlatformId;
  limit?: number;
}

export function PlatformPaymentSchedule({
  platformId,
  limit = 5,
}: PlatformPaymentScheduleProps) {
  const upcomingPayments = useUpcomingPaymentsByPlatform(platformId, 60);
  const orders = useBNPLStore((state) => state.orders);

  const displayPayments = upcomingPayments.slice(0, limit);
  const hasMore = upcomingPayments.length > limit;

  if (displayPayments.length === 0) {
    return (
      <div className="p-4 bg-dark-hover rounded-lg">
        <p className="text-sm text-gray-400 text-center">
          No upcoming payments
        </p>
      </div>
    );
  }

  return (
    <div className="bg-dark-hover rounded-lg overflow-hidden">
      <div className="p-3 border-b border-dark-border">
        <h4 className="text-sm font-medium text-white">Upcoming Payments</h4>
      </div>
      <div className="divide-y divide-dark-border">
        {displayPayments.map((payment) => {
          const order = orders.find((o) => o.id === payment.orderId);
          const dueDate = parseISO(payment.dueDate);

          return (
            <div
              key={payment.id}
              className="flex items-center justify-between p-3"
            >
              <div>
                <span className="text-sm text-gray-400">
                  {format(dueDate, 'MMM d')}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-400 truncate max-w-[120px]">
                  {order?.storeName || 'Unknown'}
                </span>
                <span className="text-sm font-medium text-white">
                  {formatCurrency(payment.amount)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      {hasMore && (
        <div className="p-2 text-center border-t border-dark-border">
          <span className="text-xs text-gray-500">
            +{upcomingPayments.length - limit} more payments
          </span>
        </div>
      )}
    </div>
  );
}
