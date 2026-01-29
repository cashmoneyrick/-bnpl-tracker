import { Button } from '../shared/Button';
import { InstallmentDots } from '../shared/InstallmentDots';
import { useBNPLStore } from '../../store';
import { useOrderProgress, useNextPayment } from '../../store/selectors';
import { formatCurrency } from '../../utils/currency';
import { formatRelativeTime } from '../../hooks/useRelativeTime';
import type { Order } from '../../types';

interface OrderRowProps {
  order: Order;
}

function OrderRow({ order }: OrderRowProps) {
  const progress = useOrderProgress(order.id);
  const nextPayment = useNextPayment(order.id);
  const openOrderDetailModal = useBNPLStore((state) => state.openOrderDetailModal);
  const markPaymentPaid = useBNPLStore((state) => state.markPaymentPaid);

  const isCompleted = order.status === 'completed';
  const isOverdue = nextPayment?.status === 'overdue';
  const now = new Date();

  const handleClick = () => {
    openOrderDetailModal(order.id);
  };

  const handleMarkPaid = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (nextPayment) {
      await markPaymentPaid(nextPayment.id);
    }
  };

  const nextPaymentInfo = nextPayment
    ? formatRelativeTime(nextPayment.dueDate, now)
    : null;

  return (
    <div
      onClick={handleClick}
      className={`
        flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors
        ${isOverdue ? 'bg-red-500/10 border border-red-500/30' : 'bg-dark-hover hover:bg-dark-card'}
      `}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <span className="font-medium text-white truncate">
            {order.storeName || 'Unknown Store'}
          </span>
          <span className="text-gray-400">{formatCurrency(order.totalAmount)}</span>
        </div>
        <div className="flex items-center gap-3 mt-1">
          <InstallmentDots
            total={progress.total}
            paid={progress.paid}
            overdue={isOverdue ? 1 : 0}
            size="sm"
          />
          <span className="text-xs text-gray-500">
            {progress.paid}/{progress.total} paid
          </span>
          {nextPaymentInfo && (
            <span className={`text-xs ${isOverdue ? 'text-red-400' : 'text-gray-500'}`}>
              {isOverdue ? 'Overdue' : `Next: ${nextPaymentInfo.text}`}
            </span>
          )}
          {isCompleted && (
            <span className="text-xs text-green-400">Completed</span>
          )}
        </div>
      </div>

      {!isCompleted && nextPayment && (
        <Button
          variant={isOverdue ? 'danger' : 'ghost'}
          size="sm"
          onClick={handleMarkPaid}
        >
          Mark Paid
        </Button>
      )}
    </div>
  );
}

interface PlatformOrdersListProps {
  orders: Order[];
  emptyMessage?: string;
}

export function PlatformOrdersList({
  orders,
  emptyMessage = 'No orders',
}: PlatformOrdersListProps) {
  if (orders.length === 0) {
    return (
      <p className="text-sm text-gray-500 text-center py-4">{emptyMessage}</p>
    );
  }

  return (
    <div className="space-y-2">
      {orders.map((order) => (
        <OrderRow key={order.id} order={order} />
      ))}
    </div>
  );
}
